const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

const cors = require("cors");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const presetTestsModel = require('./models/presetTests');
const testsModel = require('./models/tests');
const usersModel = require('./models/users');

require('dotenv').config();
const app = express();
const port = 8080;

app.use(bodyParser.json());
app.use(cors());

const dbURI = process.env.MONGO_URI;

mongoose.connect(dbURI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((error) => console.error('Connection error', error));


const counterSchema = new mongoose.Schema({
    _id: { type: String },
    sequence_value: { type: Number }
});

const CounterModel = mongoose.model('Counter', counterSchema, 'counters');

let seqDoc = {
    _id: String,
    sequence_value: Number,
    __v: Number
}

async function getNextSequenceValue(sequenceName) {
    seqDoc = await CounterModel.findOneAndUpdate(
        { _id: sequenceName },
        { $inc: { sequence_value: 1 } },
        { returnOriginal: false, new: true, upsert: true }
    );

    return seqDoc.sequence_value;
}

// GET RUTE
app.get('/presetTests', async (req, res) => {

    await presetTestsModel.find().then(doc => {
       res.status(200).json(doc);
    }).catch(err => {
        console.log("Error fetching data: ", err);
        res.status(500).json({message : err.message});
    });

});

app.get('/tests', async (req, res) => {

    await testsModel.find().then(doc => {
        res.status(200).json(doc);
    }).catch(err => {
        console.error("Error fetching docs: ", err);
        res.status(500).json( {message : err.message} );
    });

});

app.get('/presetTests/:id', async (req, res) => {

    await presetTestsModel.findOne( { "_id" : parseInt(req.params.id, 10) } ).then(doc => {
        res.status(200).json(doc);
    }).catch(err => {
        console.error("Error fetching doc: ", err);
        res.status(500).json( {message : err.message} );
    });

});

app.get('/tests/:id', async (req, res) => {

    await testsModel.findOne( { "_id" : parseInt(req.params.id, 10) } ).then(doc => {
        res.status(200).json(doc);
    }).catch(err => {
        console.error("Error fetching doc: ", err);
        res.status(500).json( {message : err.message} );
    });

});


// POST RUTE
const authMiddleware = (req, res, next) => {
    const token = req.header('x-auth-token');

    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

app.post('/tests', authMiddleware, async (req, res) => {
    const newId = await getNextSequenceValue('tests');

    const test = new testsModel({
        ...req.body,
        _id: newId
    });

    await test.save().then(newTest => {
        console.log("Test saved successfully!");
        res.status(201).json(newTest);
    }).catch(err => {
        console.error("Error fetching doc: ", err);
        res.status(400).json( {message : err.message} );
    });

});

app.post('/register', async (req, res) => {
    const { name, lastName, email, username, password } = req.body;

    try {
        let user = await usersModel.findOne({ username });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        user = new usersModel({
            name,
            lastName,
            email,
            username,
            password
        });

        await user.save();

        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.json({ token });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        let user = await usersModel.findOne({ username });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.json({ msg: "Success", tkn: token });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});





app.listen(port);
