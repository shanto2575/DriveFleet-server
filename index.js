const express = require('express')
const app = express()
const cors = require('cors')
const dotenv = require('dotenv')
dotenv.config()
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs')

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
const bookingCollection = db.collection('booking')

const JWKS = createRemoteJWKSet(
    new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
)
const verifyToken = async (req, res, next) => {
    const authHeaders = req.headers?.authorization;
    if (!authHeaders) {
        res.status(401).json({ message: 'Unauthorization' })
    }
    const token = authHeaders.split(' ')[1]
    if (!token) {
        res.status(401).json({ message: 'Unauthorization' })
        // console.log(token)
    }
    try {
        const { payload } = await jwtVerify(token, JWKS)
        // console.log(payload)
        next()

    } catch (error) {
        console.log(error)
        return res.status(403).json({ message: 'forbidden' })
    }
}
// async function run() {
//     try {
// await client.connect();


app.get('/featured', async (req, res) => {
    const result = await CarCollection.find().limit(6).toArray()
    res.json(result)
})

app.get('/my-added-cars/:id', verifyToken, async (req, res) => {
    const id = req.params.id;
    const result = await CarCollection.find({ userId: id }).sort({ _id: -1 }).toArray()
    res.json(result)
})

app.patch('/my-added-cars/:id', verifyToken, async (req, res) => {
    const id = req.params.id;
    const update = req.body;
    const result = await CarCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: update },
    )
    res.json(result)
})

app.delete('/my-added-cars/:id', verifyToken, async (req, res) => {
    const id = req.params.id;
    const result = await CarCollection.deleteOne({ _id: new ObjectId(id) })
    res.json(result)
    // console.log(result)
})

//cars

app.get('/cars', async (req, res) => {
    const search = req.query.search || '';
    const type = req.query.type || '';
    
    // Pagination parameters with default values
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 9;
    const skip = (page - 1) * limit;

    const query = {};
    if (search) {
        query.carName = {
            $regex: search,
            $options: 'i'
        };
    }
    if (type && type !== 'All') {
        query.carType = type;
    }

    try {
        // Fetch paginated data and total count in parallel
        const [cars, totalCars] = await Promise.all([
            CarCollection.find(query).skip(skip).sort({ _id: -1 }).limit(limit).toArray(),
            CarCollection.countDocuments(query)
        ]);

        const totalPages = Math.ceil(totalCars / limit);

        res.json({
            cars,
            totalPages,
            currentPage: page,
            totalCars
        });
    } catch (error) {
        console.error("Error fetching cars:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get('/cars/:id', async (req, res) => {
    const { id } = req.params;

    const result = await CarCollection.findOne({ _id: new ObjectId(id) })
    res.json(result)
})

app.post('/cars', async (req, res) => {
    const carsData = req.body;
    carsData.bookingCount = 0;
    const result = await CarCollection.insertOne(carsData)
    res.json(result)
})


//booking

app.get('/booking/:userId', verifyToken, async (req, res) => {
    const { userId } = req.params;
    const result = await bookingCollection.find({ userId: userId }).sort({ createdAt: -1 }).toArray()
    res.json(result)
    // console.log(result)
})

app.post('/booking', verifyToken, async (req, res) => {
    const data = req.body;
    const carId = data.carId;
    const result = await bookingCollection.insertOne(data)
    const updateCar = await CarCollection.updateOne(
        { _id: new ObjectId(carId) },
        {
            $inc: { bookingCount: 1 }
        }
    )
    res.json({ result, updateCar })
})

app.delete('/booking/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const result = await bookingCollection.deleteOne({ _id: new ObjectId(id) })
    res.json(result)
})

// await client.db("admin").command({ ping: 1 });
//         console.log("Pinged your deployment. You successfully connected to MongoDB!");
//     } finally {
// await client.close();
//     }
// }
// run().catch(console.dir);

app.get('/', (req, res) => {
    res.json('Server is Running Fine')
})
app.listen(port, () => {
    console.log(`Server is Running On Port ${port}`)
})

