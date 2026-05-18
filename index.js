const express = require('express')
const app = express()
const cors = require('cors')
const dotenv = require('dotenv')
dotenv.config()
const port = process.env.PORT
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI;

app.use(cors())
app.use(express.json())

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const db = client.db('DriveFleet-Car')
const CarCollection = db.collection('Cars')

async function run() {
    try {
        await client.connect();

        app.get('/cars', async (req, res) => {
            const result = await CarCollection.find().toArray();
            res.json(result);
        });

        app.get('/cars/:id', async (req, res) => {
            const { id } = req.params;
            const result = await CarCollection.findOne({ _id: new ObjectId(id) })
            res.json(result)
        })

        app.post('/cars', async (req, res) => {
            const carsData = req.body;
            const result = await CarCollection.insertOne(carsData)
            res.json(result)
        })

        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.json('Server is Running Fine')
})
app.listen(port, () => {
    console.log(`Server is Running On Port ${port}`)
})

