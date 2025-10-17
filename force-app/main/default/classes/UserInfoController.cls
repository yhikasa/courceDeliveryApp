public with sharing class UserInfoController {
    public UserInfoController() {
    }

    /**
     * 現在のユーザーのメールアドレスを取得します。
     */
    @AuraEnabled(cacheable=true)
    public static String getCurrentUserEmail() {
        return UserInfo.getUserEmail();
    }
}