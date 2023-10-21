const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);

// mongodb connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fuichu5.mongodb.net/?retryWrites=true&w=majority`;

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
        // await client.connect();

        const userCollection = client.db('toysDB').collection('users');
        const subCategoryCollection = client.db('toysDB').collection('subcategories');
        const toyCollection = client.db('toysDB').collection('toys');
        const myCollection = client.db("toysDB").collection("mycollections")
        const paymentCollection = client.db('toysDB').collection('payments');

        // const indexKeys = { toyName: 1 };

        // const indexOptions = { name: "toyName" }

        // const result = await toyCollection.createIndex(indexKeys, indexOptions);

        // users route
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;

            const result = await userCollection.findOne({ email: email });
            // console.log(result);
            res.send(JSON.stringify(result));
        });

        app.get('/users/role/owner/:email', async (req, res) => {
            const email = req.params.email;

            const user = await userCollection.findOne({ email: email });

            if (user?.role === 'Owner') {
                res.send(true);
            }
            else {
                res.send(false);
            }
        })

        app.post('/users', async (req, res) => {
            const newUser = req.body;

            // console.log(newUser);

            const result = await userCollection.insertOne(newUser);
            res.send(result);
        });


        // get route for all sub categories

        app.get('/subcategories', async (req, res) => {
            const cursor = subCategoryCollection.find();

            const result = await cursor.sort({ _id: 1 }).toArray();
            res.send(result);
        });


        // get route for all toys (limit at 20)
        app.get('/toys', async (req, res) => {
            const cursor = toyCollection.find().limit(20);

            const result = await cursor.toArray();
            res.send(result);
        });


        // get route for my toys
        app.get('/toys/mytoys', async (req, res) => {
            const email = req.query.email;

            const query = { sellerEmail: email };

            const cursor = toyCollection.find(query);

            const result = await cursor.toArray();
            res.send(result);
        });

        // get route for sorting my toys by price
        app.get('/toys/sort', async (req, res) => {
            const sortOrder = req.query.price;
            const email = req.query.email;

            const query = { sellerEmail: email };

            if (sortOrder === 'Ascending') {
                const cursor = toyCollection.find(query).sort({ price: 1 }).collation({ locale: "en_US", numericOrdering: true });

                const result = await cursor.toArray();
                res.send(result);
            }

            if (sortOrder === 'Descending') {
                const cursor = toyCollection.find(query).sort({ price: -1 }).collation({ locale: "en_US", numericOrdering: true });

                const result = await cursor.toArray();
                res.send(result);
            }
        });


        // get route for single toy details
        app.get('/toys/:id', async (req, res) => {
            const id = req.params.id;

            const query = { _id: new ObjectId(id) };

            const result = await toyCollection.findOne(query);
            res.send(result);
        });

        // get route for searching by name in all toys
        app.get('/toys/search/toyname', async (req, res) => {
            const toyName = req.query.name;

            const query = { toyName: { $regex: toyName, $options: "i" } }

            const cursor = toyCollection.find(query);

            const result = await cursor.toArray();
            res.send(result);
        });


        // get route for showing toys by category in the tabs
        app.get('/toys/category/:subcategory', async (req, res) => {
            let subcategory = req.params.subcategory;

            const first = subcategory.charAt(0).toUpperCase();
            const remaining = subcategory.slice(1);

            subcategory = first + remaining;

            const query = { subCategory: subcategory };

            const cursor = toyCollection.find(query);

            const result = await cursor.toArray();
            res.send(result);
        });


        // post route for creating/adding a toy
        app.post('/toys', async (req, res) => {
            const newToy = req.body;

            const result = await toyCollection.insertOne(newToy);
            res.send(result);
        });


        //put route for updating a toy
        app.put('/toys/:id', async (req, res) => {
            const id = req.params.id;

            const updatedToy = req.body;

            const filter = { _id: new ObjectId(id) };

            const options = { upsert: true };

            const updateDoc = {
                $set: {
                    price: updatedToy.price,
                    quantity: updatedToy.quantity,
                    description: updatedToy.description
                }
            };

            const result = await toyCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        });


        app.patch('/toys/quantity/:id', async (req, res) => {
            const id = req.params.id;

            const filter = { _id: new ObjectId(id) };

            const toy = await toyCollection.findOne(filter);

            const options = { upsert: true };

            const updateDoc = {
                $set: {
                    quantity: toy?.quantity - 1
                }
            };

            const result = await toyCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })


        // delete route for deleting/removing a toy
        app.delete('/toys/:id', async (req, res) => {
            const id = req.params.id;

            const query = { _id: new ObjectId(id) };

            const result = await toyCollection.deleteOne(query);
            res.send(result);
        });



        // my collection route
        app.get('/mycollections', async (req, res) => {
            const {email} = req.query;
            
            const query = {buyerEmail: email};

            const result = await myCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/mycollections/sort', async (req, res) => {
            const {order, email} = req.query;

            const query = {buyerEmail: email};

            if(order === "Ascending") {
                const cursor = myCollection.find(query).sort({price: 1}).collation({locale: "en_US", numericOrdering: true});

                const result = await cursor.toArray();
                res.send(result);
            }

            if(order === "Descending") {
                const cursor = myCollection.find(query).sort({price: -1}).collation({locale: "en_US", numericOrdering: true});

                const result = await cursor.toArray();
                res.send(result);
            }

        })


        app.post('/mycollections', async (req, res) => {
            const newToy = req.body;

            const toy = await myCollection.findOne({ toyId: newToy?.toyId });

            if (toy) {
                const filter = { toyId: newToy?.toyId };

                const options = { upsert: true };

                const updateDoc = {
                    $set: {
                        quantity: toy?.quantity + 1
                    }
                };

                const result = await myCollection.updateOne(filter, updateDoc, options);
                res.send(result);
            }
            else {
                const result = await myCollection.insertOne(newToy);
                res.send(result);
            }
        })



        // Payment Intent
        app.post('/create-payment-intent', async (req, res) => {
            let { price } = req.body;

            price *= 100;
            price = Number(price.toFixed(2));

            const paymentIntent = await stripe.paymentIntents.create({
                amount: price,
                currency: "usd",
                payment_method_types: [
                    "card"
                ],
            });

            // console.log(paymentIntent);

            res.send({
                clientSecret: paymentIntent?.client_secret,
            })
        })

        // payment route
        app.post('/payments', async (req, res) => {
            const payment = req.body;

            const result = await paymentCollection.insertOne(payment);
            res.send(result);
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Toy Marketplace Server Is Running....');
});

app.listen(port, () => {
    console.log(`Toy Marketplace Server Is Running On Port: ${port}`);
});