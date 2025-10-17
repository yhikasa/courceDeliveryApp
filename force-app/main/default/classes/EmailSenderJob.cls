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

        // メール送信処理
        Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
        String[] toAddresses = new String[] { this.recipientEmail };
        mail.setToAddresses(toAddresses);
        
        mail.setSubject( UserInfo.getUserName() + ' 組織の有効期限が近づいています');
        String emailBody = '組織(ID: ' + orgId + ')の有効期限は ' + 
                           expirationDate.format() + ' です。\n' +
                           '必要に応じて連絡をお願いします。\n--- \n' + 
                           'Salesforce Japan Trailhead Academy';
        mail.setPlainTextBody(emailBody);

        Messaging.sendEmail(new Messaging.SingleEmailMessage[] { mail });
    }

}