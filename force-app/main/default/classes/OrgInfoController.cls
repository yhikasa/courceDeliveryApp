public with sharing class OrgInfoController {
    /**
     * 現在の組織のTrialExpirationDateを取得します。
     * トライアル組織でない場合は null が返されます。
     */
    @AuraEnabled(cacheable=true)
    public static DateTime getTrialExpirationDate() {
        // Organizationはシングルレコードオブジェクトなので、LIMIT 1 は不要ですが、
        // 念のためリストで取得し、最初のエントリを使用します。
        List<Organization> orgs = [SELECT TrialExpirationDate FROM Organization LIMIT 1];

        if (!orgs.isEmpty()) {
            // ApexからLWCにDate型を返すことで、タイムゾーン変換が容易になります
            return orgs[0].TrialExpirationDate;
        }

        return null;
    }
}