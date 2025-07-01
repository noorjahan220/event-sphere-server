const express = require('express');
const cors = require('cors');
const app = express();
const { ObjectId } = require('mongodb');
require('dotenv').config(); const bcrypt = require('bcrypt');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require('mongodb');

const allowedOrigins = [
  "https://event-sphere-6vrsuh7hl-noorjahan-akters-projects.vercel.app",
  "https://event-sphere-77mpyx2oy-noorjahan-akters-projects.vercel.app",
  "http://localhost:5173"
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true); // allow Postman or server-to-server
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error("Not allowed by CORS"), false);
    }
    return callback(null, origin); // reflect the origin dynamically
  },
  credentials: true,
}));
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
const eventCollection = client.db('eventSphere').collection('allEvents');
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
// for login 

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await userCollection.findOne({ email });
  if (!user) {
    return res.status(400).json({ message: 'User not found' });
  }

  // Check password
  const isPasswordCorrect = await bcrypt.compare(password, user.password);
  if (!isPasswordCorrect) {
    return res.status(400).json({ message: 'Incorrect password' });
  }

  // Exclude password from response
  const { password: pwd, ...userWithoutPassword } = user;

  res.json({ message: "Login successful", user: userWithoutPassword });
});

// event related apis

app.get('/allEvent', async (req, res) => {
    const cursor = eventCollection.find();
    const result = await cursor.toArray();
    console.log("Fetched events:", result.length);
    res.send(result);
});
app.post('/addEvent', async (req, res) => {
    const event = req.body;
    const result = await eventCollection.insertOne(event);
    res.status(201).send(result);
});
app.get('/event/:email', async (req, res) => {
  const email = req.params.email;
  const events = await eventCollection.find({ postedBy: email }).toArray();
  res.send(events);
});

// DELETE event by ID


app.delete('/event/:id', async (req, res) => {
  const id = req.params.id;
  const result = await eventCollection.deleteOne({ _id: new ObjectId(id) });
  res.send(result);
});

// UPDATE event by ID
app.put('/event/:id', async (req, res) => {
  const id = req.params.id;
  const updatedEvent = req.body;

  const result = await eventCollection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        eventTitle: updatedEvent.eventTitle,
        dateTime: updatedEvent.dateTime,
        location: updatedEvent.location,
        description: updatedEvent.description,
      }
    }
  );

  res.send(result);
});

app.post('/joinEvent/:id', async (req, res) => {
  const eventId = req.params.id;
  const { userEmail } = req.body;

  const event = await eventCollection.findOne({ _id: new ObjectId(eventId) });

  // If already joined, reject
  if (event.joinedUsers?.includes(userEmail)) {
    return res.status(400).json({ message: "You already joined this event." });
  }

  // Update attendeeCount and joinedUsers
  const result = await eventCollection.updateOne(
    { _id: new ObjectId(eventId) },
    {
      $inc: { attendeeCount: 1 },
      $addToSet: { joinedUsers: userEmail } 
    }
  );

  res.json({ message: "Joined event successfully", result });
});





app.get('/', (req, res) => {
    res.send('Hello from the event-server!');
})

app.listen(port, () => {
    console.log(`Event server is running on port: ${port}`);
})