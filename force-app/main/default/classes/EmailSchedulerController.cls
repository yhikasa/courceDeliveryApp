public with sharing class EmailSchedulerController {

    // 1. 組織の有効期限を取得するメソッド
    @AuraEnabled
    public static DateTime getExpirationDate() {
        // TrialExpirationDateはDateTime型です。
        List<Organization> orgs = [SELECT TrialExpirationDate FROM Organization LIMIT 1];
        if (!orgs.isEmpty() && orgs[0].TrialExpirationDate != null) {
            return orgs[0].TrialExpirationDate;
        }
        throw new AuraHandledException('組織の有効期限を取得できませんでした。');
    }

    // 2. スケジュールを登録するメソッド
    /*
    EmailSchedulerController.scheduleEmail(7, '日', 'yhikasa@salesforce.com');
//    
    */

    @AuraEnabled
    public static Id scheduleEmail(Integer offset, String unit, String recipientEmail) {
        return scheduleEmailWithHourMinute(offset, unit, recipientEmail, 12, 0);
    }

    @AuraEnabled
    public static Id scheduleEmailWithHourMinute(Integer offset, String unit, String recipientEmail, Integer scheduleHour, Integer scheduleMinute) {
        DateTime expirationDt = getExpirationDate();
        Date expirationDate = expirationDt.date();
        Date scheduledDate;

        // 単位に基づいたスケジュール日の計算
        if (unit == '日') {
            scheduledDate = expirationDate.addDays(-offset);
        } else if (unit == '週') {
            scheduledDate = expirationDate.addDays(-offset * 7);
        } else if (unit == '月') {
            scheduledDate = expirationDate.addMonths(-offset);
        } else {
            throw new AuraHandledException('無効な単位です。');
        }

        // 実行時刻を午前9時（ユーザーのタイムゾーン）に設定（Cron式用）
        // スケジュール日を指定の時刻に実行するための Cron 式を作成
        // [秒] [分] [時] [日] [月] [曜日] [年 (オプション)]
        String cronDay = String.valueOf(scheduledDate.day());
        String cronMonth = String.valueOf(scheduledDate.month());
        
        // 午前9時に設定 (例: 0 0 9 29 9 ? 2026)
        // String cronExp = '0 0 9 ' + cronDay + ' ' + cronMonth + ' ? ' + scheduledDate.year();
        // 12時に設定 (例: 0 0 9 29 9 ? 2026)
        // String cronExp = '0 0 12 ' + cronDay + ' ' + cronMonth + ' ? ' + scheduledDate.year();
        // Cron式の [分] [時] 部分を動的に設定
        String cronExp = '0 ' + String.valueOf(scheduleMinute) + ' ' + String.valueOf(scheduleHour) + ' ' + cronDay + ' ' + cronMonth + ' ? ' + scheduledDate.year();

        // ジョブ名
        String jobName = 'Email (' + scheduledDate.format() + ' ' + String.valueOf(scheduleHour).leftPad(2, '0') + ':' + String.valueOf(scheduleMinute).leftPad(2, '0') + ' - ' + recipientEmail+')';

        // スケジュールの登録
        EmailSenderJob job = new EmailSenderJob(recipientEmail);
        return System.schedule(jobName, cronExp, job);
    }

    /**
     * emailSchedulerで登録されたスケジュールジョブ (CronTrigger) の一覧を取得
     */
    // EmailSchedulerController.getFilteredScheduledJobs();
    @AuraEnabled(cacheable=true)
    public static List<CronTrigger> getFilteredScheduledJobs() {
        // CronTrigger オブジェクトをクエリ
        return [
            SELECT 
                Id,                     // Cron Trigger ID
                CronJobDetail.Name,     // ジョブ名
                CreatedBy.Name,         // 登録実行者
                CreatedDate,            // 申請済み (作成日)
                NextFireTime,           // 次の実行スケジュール
                State,                  // 種別 (Scheduled/Running/Completeなど)
                OwnerId                 // (実行環境によってはジョブの所有者)
            FROM 
                CronTrigger
            WHERE 
                // EmailSenderJob クラスがスケジュールされたジョブのみをフィルタリング
                // CronJobDetail.JobType = '1' AND 
                CronJobDetail.Name LIKE 'Email (%'
                // または CronJobDetail.Name LIKE '%EmailSenderJob%' など、ジョブ名を特定できる条件を設定
            ORDER BY 
                CreatedDate DESC
        ];
    }
}