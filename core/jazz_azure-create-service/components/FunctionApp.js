const ResourceFactory = require('./ResourceFactory');
const msRestAzure = require('ms-rest-azure');
module.exports = class FunctionApp {    
    constructor(data){
        this.subscriptionId = data.subscriptionId;
        this.tenantId = data.tenantId;
        this.clientId = data.clientId;
        this.clientSecret = data.clientSecret;
    }

    async login(){
        this.credentials = await msRestAzure.loginWithServicePrincipalSecret(this.clientId, this.clientSecret, this.tenantId);
    }

    async create(data){
        await this.login();
        await ResourceFactory.createStorageAccount(data.resourceGroupName, data.appName, this.subscriptionId, this.credentials);
        await ResourceFactory.createHostingPlan(data.resourceGroupName, this.subscriptionId, this.credentials);
        await ResourceFactory.createFunctionApp(data.resourceGroupName, data.appName, this.subscriptionId, this.credentials);
        await ResourceFactory.upload(data.resourceGroupName, data.appName, data.zip, this.subscriptionId, this.credentials);
    }
}