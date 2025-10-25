import { LightningElement, wire, track } from 'lwc'; // **修正: trackをインポート**
import getTrialExpirationDate from '@salesforce/apex/OrgInfoController.getTrialExpirationDate';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class TrialExpirationChecker extends LightningElement {
    expirationDate;
    error;
    errorTitle;
    
    // **修正点 1: モーダルの表示状態を管理するプロパティ**
    @track isModalOpen = false; 

    // Apexメソッドの@wireで有効期限を取得
    @wire(getTrialExpirationDate)
    wiredExpirationDate({ error, data }) {
        if (data !== undefined) {
            this.expirationDate = data;
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.errorTitle = '有効期限の取得中にエラーが発生しました。';
            this.expirationDate = undefined;
            console.error('Apex Error:', error);
            
            // エラーメッセージをトーストで表示
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'エラー',
                    message: this.error,
                    variant: 'error',
                })
            );
        }
    }

    // 表示用のラベルを計算
    get expirationMessage() {
        if (this.expirationDate) {
            return `${new Date(this.expirationDate).toLocaleString()} です！`;
        } else if (this.expirationDate === null) {
            return 'トライアル有効期限は設定されていません (Developer Editionまたは購入済組織である可能性があります)。';
        }
        return '組織の有効期限情報を読み込み中です...';
    }

    get isTrialOrg() {
        return this.expirationDate;
    }

    // **修正点 2: モーダルを開くハンドラ**
    openSchedulerModal() {
        this.isModalOpen = true;
    }

    // **修正点 3: モーダルを閉じるハンドラ**
    closeSchedulerModal() {
        this.isModalOpen = false;
    }
}