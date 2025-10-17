public with sharing class UserInfoController {
    /**
     * 現在のユーザーのメールアドレスを取得します。
     */
    @AuraEnabled(cacheable=true)
    public static String getCurrentUserEmail() {
        return UserInfo.getUserEmail();
    }
}