@IsTest
private class AbortJobControllerTest {

    // テスト対象メソッド: スケジュールジョブの中止
    @IsTest
    static void testAbortJob_success() {
        // 1. スケジュールジョブを登録するための準備
        
        // テスト用のダミーのSchedulableクラスのインスタンス
        EmailSenderJob testJob = new EmailSenderJob('dummy@example.com');
        String jobName = 'Test Job to Abort ' + System.currentTimeMillis();
        
        // Cron式: 実行可能ではない未来の日時 (例: 2099年1月1日 00:00)
        // System.scheduleは最低でも次の分に実行を設定する必要があるため、適当な未来の日付を設定します。
        // SchedulableContextはテストでは無視されます。
        String futureCronExp = '0 0 0 1 1 ? 2099';

        // 2. ジョブをスケジュールし、CronTriggerのIDを取得
        // Test.startTest()の外でスケジュール登録
        Id cronTriggerId = System.schedule(jobName, futureCronExp, testJob);
        
        // 登録が成功したことを確認
        System.assertNotEquals(null, cronTriggerId, 'スケジュール登録に成功し、IDが返されるべきです。');

        Test.startTest();
        
        // 3. AbortJobController.abortJobを呼び出してジョブを中止
        AbortJobController.abortJob(cronTriggerId);

        Test.stopTest(); // ジョブの中止操作を完了させる

        
    }
}