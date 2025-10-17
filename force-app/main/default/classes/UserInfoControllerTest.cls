@IsTest
private class UserInfoControllerTest {

    @IsTest
    static void testGetCurrentUserEmail_returnsCorrectEmail() {
        // 1. テストデータの準備: メールアドレスが明確なユーザーを作成
        String testUsername = 'testuser_' + System.currentTimeMillis() + '@example.com';
        String expectedEmail = 'testuser.email@verified.com';

        User testUser = new User(
            ProfileId = [SELECT Id FROM Profile WHERE Name IN ('標準ユーザー', 'Standard User') LIMIT 1].Id,
            LastName = 'Test',
            FirstName = 'User',
            Email = expectedEmail, // 期待されるメールアドレスを設定
            Username = testUsername,
            Alias = 'tuser',
            TimeZoneSidKey = 'America/Los_Angeles',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US'
        );

        // 2. テストの実行 (System.runAs を使用)
        System.runAs(testUser) {
            Test.startTest();
            
            // メソッドを実行
            String actualEmail = UserInfoController.getCurrentUserEmail();
            
            Test.stopTest();

            // 3. 検証
            // UserInfo.getUserEmail() は、実行しているコンテキストユーザーのメールアドレスを返すはずです。
            System.assertEquals(expectedEmail, actualEmail, 'メソッドは runAs で指定されたユーザーのメールアドレスを返す必要があります。');
        }
    }
}