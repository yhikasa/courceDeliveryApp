@IsTest
private class EmailSchedulerControllerTest {
    @IsTest
    static void testGetExpirationDate_success() {
        Test.startTest();
        DateTime got = EmailSchedulerController.getExpirationDate();
        Test.stopTest();
    }

    @IsTest
    static void testScheduleEmail_createsScheduledJob_dayUnit() {
        String recipient = 'test@example.com';

        Test.startTest();
        Id jobId = EmailSchedulerController.scheduleEmail(3, '日', recipient);
        Test.stopTest();

        System.assertNotEquals(null, jobId, 'System.schedule should return a CronTrigger Id');

        // Verify CronTrigger recorded
        List<CronTrigger> cts = [SELECT Id, CronJobDetail.Name, NextFireTime FROM CronTrigger WHERE Id = :jobId];
        System.assertEquals(1, cts.size(), 'A CronTrigger should exist for the scheduled job');
        System.assert(cts[0].CronJobDetail.Name.startsWith('Email ('), 'Job name should be prefixed with Email (');
    }

    @IsTest
    static void testScheduleEmail_createsScheduledJob_weekUnit() {
        String recipient = 'test@example.com';
        Test.startTest();
        Id jobId = EmailSchedulerController.scheduleEmail(0, '週', recipient);
        Test.stopTest();
    }

    @IsTest
    static void testScheduleEmail_createsScheduledJob_monthUnit() {
        String recipient = 'test@example.com';
        Test.startTest();
        Id jobId = EmailSchedulerController.scheduleEmail(0, '月', recipient);
        Test.stopTest();
    }

    @IsTest
    static void testGetScheduledJobs() {
        Test.startTest();
        List<AsyncApexJob> aajList = EmailSchedulerController.getScheduledJobs();
        Test.stopTest();
    }

    @IsTest
    static void testGetFilteredScheduledJobs() {
        Test.startTest();
        List<CronTrigger> ctList = EmailSchedulerController.getFilteredScheduledJobs();
        Test.stopTest();
    }

}