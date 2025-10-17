@IsTest
private class OrgInfoControllerTest {

    @IsTest
    static void testGetTrialExpirationDate_success() {
        Test.startTest();
        DateTime actualDate = OrgInfoController.getTrialExpirationDate();
        Test.stopTest();
        System.assertNotEquals(null, actualDate, '有効期限はnullであってはなりません。');
    }

}