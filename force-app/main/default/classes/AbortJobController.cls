public with sharing class AbortJobController {
    @AuraEnabled
    public static void abortJob(Id cronTriggerId) {
        System.abortJob(cronTriggerId);
    }
}