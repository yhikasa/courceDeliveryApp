/*
仕様
コンポーネント名： emailScheduler
入力域：
・数値
・選択肢　日/週/月
・メールアドレス

ボタン：
・登録

表示域：
現在のSchedule Apexの一覧を表示
表示内容
・実行日
・ジョブ種別
・状況
・状況の詳細
・合計バッチ数
・一括処理済み
・失敗
・登録実行者
・完了日
・Apex クラス
・Apex メソッド
・Apex ジョブ ID

登録ボタン押下時の処理：
１．その組織の有効期限を取得する
２．有効期限から、ユーザーが入力した日/週の日数前に、メールを送信する、スケジュールを登録する

例
操作日：　2026年10月1日
入力：
・数値　2
・選択肢　日
・メールアドレス　admin@example.com
→　2026年9月29日に admin@example.com へメールを送信する

*/

import { LightningElement, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import scheduleEmailWithHourMinute from '@salesforce/apex/EmailSchedulerController.scheduleEmailWithHourMinute';
import getFilteredScheduledJobs from '@salesforce/apex/EmailSchedulerController.getFilteredScheduledJobs';
import getTrialExpirationDate from '@salesforce/apex/OrgInfoController.getTrialExpirationDate'; // 有効期限を取得
import abortJob from '@salesforce/apex/AbortJobController.abortJob';
import { refreshApex } from '@salesforce/apex';
import getCurrentUserEmail from '@salesforce/apex/UserInfoController.getCurrentUserEmail'; // ユーザーメール取得

// CronTrigger用の列定義
const CRON_COLUMNS = [
    { 
        label: '削除', 
        type: 'button', 
        typeAttributes: { 
            label: '削除', 
            name: 'delete_job', 
            variant:'base' 
        },
        initialWidth: 50
    },
    { label: 'ジョブ名(送信日時-メアド)', fieldName: 'Name', type: 'text' },
//    { label: '登録実行者', fieldName: 'CreatedByName', type: 'text' },
//    { label: '申請済み', fieldName: 'CreatedDate', type: 'date', typeAttributes: { 
//        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
//    }},
/*
    { label: '送信日時', fieldName: 'NextFireTime', type: 'date', typeAttributes: { 
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }},
*/
    { label: '状況', fieldName: 'State', type: 'text' },
//    { label: 'Cron Trigger ID', fieldName: 'Id', type: 'text' }
];

export default class EmailScheduler extends LightningElement {
    @track offsetValue = 1;     // デフォルトは一週間前
    @track selectedUnit = '週'; // デフォルトは一週間前
    @track emailAddress;
    @track isScheduling = false;
    
    // **新規追加プロパティ: 時と分**
    @track scheduleHour = 12;   // デフォルト: 12時 (正午)
    @track scheduleMinute = 0; // デフォルト: 0分
    // ★ 新規追加プロパティ: 時刻設定の表示/非表示を制御
    @track isTimeSettingEnabled = false;

    // 組織の有効期限
    @track orgExpirationDate;
    @track calculatedScheduleDate; // プレビュー用のスケジュール日時

    // スケジュールジョブ一覧の再読み込み制御 (CronTrigger用)
    @track refreshCronJobs; // CronTriggerのrefreshApexを格納するプロパティに変更

    // データテーブル
    jobsError;

    // Apexジョブ一覧の再読み込み制御
    @track refreshApexJobs;

    // ★ 追加: ユーザーメールアドレスを取得し、初期値に設定
    @wire(getCurrentUserEmail)
    wiredCurrentUserEmail({ error, data }) {
        if (data) {
            this.emailAddress = data;
        } else if (error) {
            console.error('ユーザーメールアドレスの取得中にエラー:', error);
            // 取得に失敗した場合、初期値は空のままになります
        }
    }
    // 新しいジョブ一覧（CronTrigger）の取得
    @wire(getFilteredScheduledJobs)
    wiredCronJobs(result) {
        // **修正点 1: refreshApex用のプロパティをCronTrigger用に変更**
        this.refreshCronJobs = result; // refreshApex用
        const { data, error } = result;
        if (data) {
            // データ変換: CronJobDetail.Name, CreatedBy.Nameを展開
            this.scheduledCronJobs = data.map(job => {
                return {
                    ...job,
                    Name: job.CronJobDetail.Name,
                    CreatedByName: job.CreatedBy.Name,
                };
            });
            this.cronJobsError = undefined;
        } else if (error) {
            this.cronJobsError = 'スケジュール一覧の取得に失敗しました。';
            this.scheduledCronJobs = undefined;
            console.error(error);
        }
    }

    // 選択肢の定義
    get unitOptions() {
        return [
            { label: '日', value: '日' },
            { label: '週', value: '週' },
            { label: '月', value: '月' },
        ];
    }

    // 入力値の変更ハンドラ
    handleInputChange(event) {
        console.log('時間変更: ', this.calculatedScheduleDate);
        const field = event.target.dataset.field;
        if (field === 'offset') {
            this.offsetValue = event.target.value;
        } else if (field === 'unit') {
            this.selectedUnit = event.target.value;
        } else if (field === 'email') {
            this.emailAddress = event.target.value;
        } else if (field === 'hour') { // **時刻の変更**
            this.scheduleHour = event.target.value;
        } else if (field === 'minute') { // **分の変更**
            this.scheduleMinute = event.target.value;
        }
        // 入力変更のたびにスケジュール日時を再計算**
        this.calculateScheduleDate();
        console.log('時間変更: ', this.calculatedScheduleDate);
    }

    // ★ 新規追加メソッド: トグル変更ハンドラ
    handleTimeToggle(event) {
        this.isTimeSettingEnabled = event.target.checked;
    }

    // 組織の有効期限を取得するApex呼び出し
    @wire(getTrialExpirationDate)
    wiredExpirationDate({ error, data }) {
        if (data) {
            this.orgExpirationDate = data; // Apexから返されたDateTime
            this.calculateScheduleDate(); // 有効期限取得後、初期スケジュールを計算
            console.log('有効期限を取得しました:', data);
        } else if (error) {
            console.error('有効期限の取得中にエラー:', error);
            // エラー表示処理は省略またはトーストで対応
        }
    }

    // 実行スケジュール日時を計算**
    calculateScheduleDate() {
        if (!this.orgExpirationDate || !this.offsetValue) {
            this.calculatedScheduleDate = null;
            return;
        }
        console.log('calculateScheduleDate - 1: ', this.calculatedScheduleDate);
        
        // Date/Time操作のためにJavaScriptのDateオブジェクトに変換
        const expiration = new Date(this.orgExpirationDate);
        let scheduleTime = new Date(expiration.getTime());
        const offset = parseInt(this.offsetValue, 10);

        console.log('calculateScheduleDate - 2: ', this.calculatedScheduleDate);

        if (isNaN(offset) || offset <= 0) {
            this.calculatedScheduleDate = null;
            return;
        }

        // Apexロジックに合わせて、午前9時（ユーザータイムゾーン）実行を想定した計算を実行
        // ただし、JSでの日付計算はユーザーのローカルタイムゾーンの影響を受けるため、
        // 単純な減算ロジックでプレビューします。
        
        console.log('calculateScheduleDate - 3: ', this.calculatedScheduleDate);
        // 1. 日付の計算 (前回と同様)
        if (this.selectedUnit === '日') {
            // 日数分減算
            scheduleTime.setDate(scheduleTime.getDate() - offset);
        } else if (this.selectedUnit === '週') {
            // 7日*週数分減算
            scheduleTime.setDate(scheduleTime.getDate() - (offset * 7));
        } else if (this.selectedUnit === '月') {
            // 月数分減算
            scheduleTime.setMonth(scheduleTime.getMonth() - offset);
        }

        console.log('calculateScheduleDate - 4: ', this.calculatedScheduleDate);
        // 2. 時刻の設定 (ユーザーのローカルタイムゾーンに基づいて設定)
        console.log('時刻設定', this.scheduleHour, this.scheduleMinute );
        scheduleTime.setHours(this.scheduleHour);
        scheduleTime.setMinutes(this.scheduleMinute);
        scheduleTime.setSeconds(0);
        scheduleTime.setMilliseconds(0);

        // 結果をプロパティに格納 (toLocaleString()で日付と時刻を含める)
        this.calculatedScheduleDate = scheduleTime;
    }

    // **表示用ゲッター**
    get expirationMessage() {
        if (this.orgExpirationDate) {
            return `本組織の有効期限は ${new Date(this.orgExpirationDate).toLocaleString()} です。`;
        }
        return '読み込み中です...';
    }
    
    get previewMessage() {
        if (this.calculatedScheduleDate) {
            return `メール送信日時: ${this.calculatedScheduleDate.toLocaleString()}`;
        }
        return '通知日時を設定してください';
    }

    get scheduledDateTime() {
        if (!this.calculatedScheduleDate) {
                return '通知までの日数と時刻を入力してください。';
        }

        const date = this.calculatedScheduleDate;
        
        // カスタムオプションを定義
        const options = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false, // 24時間表記 (hh:mm)
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone // ユーザーの現在のタイムゾーンを使用
        };

        // 'ja-JP'ロケールとカスタムオプションを使用してフォーマット
        const formatter = new Intl.DateTimeFormat('ja-JP', options);
        const parts = formatter.formatToParts(date);
        
        // YYYY年MM月DD日 hh:mm 形式を構築
        let year = parts.find(p => p.type === 'year').value;
        let month = parts.find(p => p.type === 'month').value;
        let day = parts.find(p => p.type === 'day').value;
        let hour = parts.find(p => p.type === 'hour').value;
        let minute = parts.find(p => p.type === 'minute').value;
        
        const formattedDate = `${year}年${month}月${day}日 ${hour}:${minute}`;

        return `${formattedDate}`;
    }

    // 登録ボタン押下時の処理
    async handleRegister() {
        if (!this.validateInputs()) return;

        this.isScheduling = true;
        try {
            await scheduleEmailWithHourMinute({
                offset: this.offsetValue,
                unit: this.selectedUnit,
                recipientEmail: this.emailAddress,
                scheduleHour: parseInt(this.scheduleHour, 10),
                scheduleMinute: parseInt(this.scheduleMinute, 10)
            });

            this.showToast('成功', 'メール送信スケジュールが登録されました。', 'success');

            refreshApex(this.refreshCronJobs);
        } catch (error) {
            this.showToast('エラー', 'スケジュールの登録に失敗しました。' + this.getErrorMessage(error), 'error');
            console.error('Scheduling Error:', error);
        } finally {
            this.isScheduling = false;
        }
    }

    // 入力値の検証
    validateInputs() {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!this.offsetValue || this.offsetValue <= 0 || !Number.isInteger(Number(this.offsetValue))) {
            this.showToast('検証エラー', '数値を正の整数で入力してください。', 'warning');
            return false;
        }
        if (!this.emailAddress || !emailRegex.test(this.emailAddress)) {
            this.showToast('検証エラー', '有効なメールアドレスを入力してください。', 'warning');
            return false;
        }
        return true;
    }

    // エラーメッセージの抽出
    getErrorMessage(error) {
        if (error.body && error.body.message) {
            return error.body.message;
        }
        if (error.message) {
            return error.message;
        }
        return JSON.stringify(error);
    }
    
    // トースト通知
    showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({ title, message, variant })
        );
    }

    // データテーブル
    cronColumns = CRON_COLUMNS; // 新しい列定義
    scheduledCronJobs;          // CronTriggerデータ格納用
    cronJobsError;
    
    // 行アクション (削除) ハンドラを追加
    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;

        if (actionName === 'delete_job') {
            this.deleteScheduledJob(row.Id);
        }
    }
    
    // 削除処理のメソッド (Apexで System.abortJob() を実行するメソッドが必要)
    async deleteScheduledJob(cronTriggerId) {
        // **注意**: ここで System.abortJob(cronTriggerId) を実行するApexメソッド (例: AbortJobController.abortJob) が別途必要です。
        
        // 例: Apex呼び出し
        try {
            await abortJob({ cronTriggerId: cronTriggerId });
            this.showToast('成功', 'スケジュールジョブが削除されました。', 'success');
            // データテーブルを再読み込み
            refreshApex(this.refreshCronJobs);
        } catch (error) {
            this.showToast('エラー', 'ジョブの削除に失敗しました。', 'error');
        }
    }
}