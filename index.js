const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config(); const bcrypt = require('bcrypt');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require('mongodb');




app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.rq93w.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

// Collections
const eventCollection = client.db('eventSphere').collection('events');
const userCollection = client.db('eventSphere').collection('users');

// post api for registering a user
app.post('/register', async (req, res) => {
    const {
        name,
        email,
        password,
        image
    } = req.body;
    // check if user already exists
    const existingUser = await userCollection.findOne({ email });
    if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
    }
    //  Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = {
        name,
        email,
        password: hashedPassword,
        image
    };

    const result = await userCollection.insertOne(newUser);
    res.status(201).json({ message: "User registered successfully", userId: result.insertedId });
});
app.get('/users', async (req, res) => {
    const users = await userCollection.find({}).toArray();
    const usersWithoutPasswords = users.map(({ password, ...rest }) => rest);
    res.json(usersWithoutPasswords);
});



app.get('/', (req, res) => {
    res.send('Hello from the event-server!');
})

app.listen(port, () => {
    console.log(`Event server is running on port: ${port}`);
})