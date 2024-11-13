
export const development = { 
  connect: {
    client: 'pg',
    connection: {
      host: 'localhost',
      port: '5432',
      user: 'postgres',
      password: '0896',
      database: 'firstClass'
    },
    migrations: {
      tableName: 'migrations_templates',
      directory: './migrations'
    }
  }
};
