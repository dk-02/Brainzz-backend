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

// AUTH MIDDLEWARE
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
const adminAuthMiddleware = async (req, res, next) => {
    const token = req.header('x-auth-token');

    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;

        // Provjera je li korisnik admin
        const adminUser = await usersModel.findById(req.user.id);
        if (!adminUser.isAdmin) {
            return res.status(403).json({ msg: 'Access denied: Not an admin' });
        }

        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

// GET RUTE
app.get('/users', adminAuthMiddleware, async (req, res) => {
    await usersModel.find().then(users => {
        res.status(200).json(users);
    }).catch(err => {
       console.log("Error fetching data: ", err);
       res.status(500).json({message : err.message});
    });
});

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


// VALIDACIJA LOZINKE

const validatePassword = (password) => {
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
};

app.post('/register', adminAuthMiddleware, async (req, res) => {
    const { name, lastName, username, email, password, isAdmin } = req.body;

    if (!validatePassword(password)) {
        return res.status(400).send("Password must contain at least 1 capital letter, 1 number, 1 special character and be at least 8 characters long.");
    }

    try {
        let user = await usersModel.findOne({ username });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        user = new usersModel({
            name,
            lastName,
            username,
            email,
            password,
            isAdmin
        });

        await user.save();

        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.json({ status: "Success" });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});


app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        let user = await usersModel.findOne({ "username" : username });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const role = user.isAdmin ? 'admin' : 'user';

        const payload = {
            user: {
                id: user.id
            },
            role: role
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

app.post('/resetPassword', adminAuthMiddleware, async (req, res) => {
    const { username, newPassword } = req.body;

    if (!validatePassword(newPassword)) {
        return res.status(400).send("Password must contain at least 1 capital letter, 1 number, 1 special character and be at least 8 characters long.");
    }

    try {
        const user = await usersModel.findOne({ "username" : username });

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        user.password = newPassword;

        await user.save();

        res.status(200).json({ msg: 'Password reset successful' });
    } catch (err) {
        console.error('Error resetting password:', err.message);
        res.status(500).send('Server error');
    }

});

app.post('/editUserData', adminAuthMiddleware, async (req, res) => {

    const { name, lastName, email, oldUsername, newUsername, isAdmin } = req.body;

    try {

        const adminCount = await usersModel.countDocuments({ isAdmin: true });

        const userToEdit = await usersModel.findOne({ "username" : oldUsername });

        if (userToEdit && userToEdit.isAdmin) {
            if (adminCount <= 1) {
                return res.status(400).send('You cannot remove the only administrator.');
            }
        }

        let usernameCollision = await usersModel.findOne({ "username" : newUsername });

        if (usernameCollision && usernameCollision.username !== oldUsername) {
            return res.status(400).json({ msg: 'That username already exists, choose another one' });
        }

        let user = await usersModel.findOne({ "username" : oldUsername });

        user.name = name;
        user.lastName = lastName;
        user.email = email;
        user.username = newUsername;
        user.isAdmin = isAdmin;


        await user.save();

        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.json({ status: "Success" });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});


app.delete('/deleteUser', authMiddleware, async (req, res) => {
    const { username } = req.body;

    try {
        const adminCount = await usersModel.countDocuments({ isAdmin: true });

        const userToDelete = await usersModel.findOne({ "username" : username });

        if (userToDelete && userToDelete.isAdmin) {
            if (adminCount <= 1) {
                return res.status(400).send('You cannot remove the only administrator.');
            }
        }

        const deletedUser = await usersModel.findOneAndDelete({ "username" : username });

        if (!deletedUser) {
            return res.status(404).send('User not found.');
        }

        res.status(200).send('User deleted successfully.');
    } catch (error) {
        res.status(500).send('There was an error deleting the user.');
    }
});



app.listen(port);
