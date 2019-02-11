const CosmosClient = require("@azure/cosmos").CosmosClient;
const logger = require("../logger.js");

async function create(data, client) {

  logger.debug('dbaccount create starting...' + data.appName);
  return await createAccount(data, client);

}

async function getConnectionString(data, client) {

  const connectionStrings = await client.databaseAccounts.listConnectionStrings(data.resourceGroupName, data.appName);

  return connectionStrings.connectionStrings[0].connectionString; //AzureWebJobsCosmosDBConnectionStringName

}
async function createAccount(data, client) {

  const params = {
    location: data.location,
    databaseAccountOfferType: "Standard"
  };

  return await client.databaseAccounts.createOrUpdate(data.resourceGroupName, data.appName, params);

}

async function createDatabase(data, client) {

  const dbAccount = await client.databaseAccounts.get(data.resourceGroupName, data.appName);
  await createDatabaseWithEndpoint(data, client, dbAccount.documentEndpoint);

}

async function createDatabaseWithEndpoint(data, client, endpoint)
{

  const keys = await client.databaseAccounts.listKeys(data.resourceGroupName, data.appName);
  const masterKey = keys.primaryMasterKey;

  const dbClient = new CosmosClient({ endpoint, auth: { masterKey } });

  logger.debug("Setting up the database..." + data.resourceName);
  const dbResponse = await dbClient.databases.createIfNotExists({
    id: data.resourceName
  });
  const database = dbResponse.database;

  await database.containers.createIfNotExists({
    id: data.resourceName
  });

  return;

}
module.exports = {
  create,
  createDatabase,
  getConnectionString
};
