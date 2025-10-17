public class EmailSenderJob implements Schedulable {
    private String recipientEmail;

    public EmailSenderJob(String email) {
        this.recipientEmail = email;
    }

    public void execute(SchedulableContext sc) {
        // 組織の有効期限を取得
        Organization org = [SELECT Id, TrialExpirationDate FROM Organization LIMIT 1];
        Date expirationDate = org.TrialExpirationDate.date();
        String orgId = org.Id;
        String adminUsername = getAdminUsername();
        adminUsername = UserInfo.getUserName();

        // メール送信処理
        Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
        String[] toAddresses = new String[] { this.recipientEmail };
        mail.setToAddresses(toAddresses);
        
        mail.setSubject(adminUsername + ' 組織の有効期限が近づいています');
        // 
        //String emailBody = 'この組織(' + UserInfo.getOrganizationName() + ') のトライアル有効期限は ' + 
        String emailBody = '組織(ID: ' + orgId + ')の有効期限は ' + 
                           expirationDate.format() + ' です。\n' +
                           '必要に応じて連絡をお願いします。\n--- \n' + 
                           'Salesforce Japan Trailhead Academy';
        mail.setPlainTextBody(emailBody);

        Messaging.sendEmail(new Messaging.SingleEmailMessage[] { mail });
    }
    
    /**
     * 「システム管理者」または「System Administrator」プロファイルを持つ
     * admin ユーザーのユーザー名を取得します。
     * @return ユーザー名を改行区切りで結合した文字列
     */
    private String getAdminUsername() {
        List<User> admins = [
            SELECT Username 
            FROM User 
            WHERE IsActive = TRUE 
            AND
                Username like 'admin%'
            AND (
                Profile.Name = 'システム管理者' OR 
                Profile.Name = 'System Administrator'
            )
            ORDER BY CreatedDate ASC 
            LIMIT 1
        ];
        
        if (admins.isEmpty()) {
            return '該当するシステム管理者ユーザーが見つかりませんでした。';
        }else{
            return admins[0].Username;
        }
    }
}
