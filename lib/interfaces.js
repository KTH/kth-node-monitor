const { createInterface } = require('component-registry')

module.exports.IHealthCheck = createInterface({ name: 'IHealthCheck' })
module.exports.names = {
  KTH_NODE_API: 'kth-node-api',
  KTH_NODE_API_CLIENT: 'kth-node-api-client',
  KTH_NODE_LDAP: 'kth-node-ldap',
  KTH_NODE_MONGODB: 'kth-node-mongodb',
  KTH_NODE_REDIS: 'kth-node-redis',
  KTH_NODE_SYSTEM_CHECK: 'kth-node-system-check',
  KTH_NODE_SQLDB: 'kth-node-sqldb',
  KTH_NODE_AGENDA: 'kth-node-agenda',
}
