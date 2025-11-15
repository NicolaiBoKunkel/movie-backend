# this script should only be runned the first time the docker compose gets run

# this one line is just to make it easier to find in the debug log
echo "MongoDB docker 'init script' have been started **************
**************************************************************
***************************************************************
****************************************************************"

# load data from our .env file
source .env

# if the docker volume is initialized, then skip the rest of the file
if [ -f /data/db/initialized ]; then
    echo "MongoDB is already initialized. Therefore the init script will be skipped"
    exit 0
fi

# this script will be setting up all our tables, users, privileges and raw data

# Wait for MongoDB to start
echo "Waiting for MongoDB to start..."
sleep 10

# start the program

mongosh --host "localhost" --u "$MON_USERNAME" --p "$MON_PASSWORD" --authenticationDatabase "admin" <<EOF
// all the mongosh commands

// switch or create db
use shop;

// create tables
db.createCollection('product');
db.createCollection('order');
db.createCollection('user');

// add to tables (from data folder - json files ?)

// add roles
db.createRole({
  role: "shop_manager",
  privileges: [
    {
      resource: { db: "shop", collection: "product" },
      actions: ["find", "insert"]
    },
    {
      resource: { db: "shop", collection: "order" },
      actions: ["find", "insert", "remove"]
    },
    {
      resource: { db: "shop", collection: "user" },
      actions: ["find", "insert"]
    },
    {
      resource: { db: "shop", collection: "" },
      actions: ["listCollections"]
    }
  ],
  roles: []
})

db.createRole({
  role: "shop_worker",
  privileges: [
    {
      resource: { db: "shop", collection: "product" },
      actions: ["find", "insert"]
    },
    {
      resource: { db: "shop", collection: "order" },
      actions: ["find"]
    },
    {
      resource: { db: "shop", collection: "" },
      actions: ["listCollections"]
    }
  ],
  roles: []
})

db.createRole({
  role: "shop_driver",
  privileges: [
    {
      resource: { db: "shop", collection: "product" },
      actions: ["find"]
    },
    {
      resource: { db: "shop", collection: "order" },
      actions: ["find"]
    },
    {
      resource: { db: "shop", collection: "" },
      actions: ["listCollections"]
    }
  ],
  roles: []
})

// add dev user
db.createUser({
    user: "$MON_D1_USE", 
    pwd: "$MON_D1_PASS", 
    roles: [{role: "dbOwner", db: "shop"}] 
});

// add user1
db.createUser({
    user: "$MON_U1_USE",
    pwd: "$MON_U1_PASS", 
    roles: [{role: "shop_manager", db: "shop"}] 
});

// add user2
db.createUser({
    user: "$MON_U2_USE", 
    pwd: "$MON_U2_PASS", 
    roles: [{role: "shop_worker", db: "shop"}] 
});

// add user3
db.createUser({
    user: "$MON_U3_USE", 
    pwd: "$MON_U3_PASS", 
    roles: [{role: "shop_driver", db: "shop"}] 
});

// the end
print("MongoDB initialization script ran successfully!");

EOF

# keep the container alive
# wait  # TODO - check if this line IS needed to not kill the container