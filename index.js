const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const port = 8080;

app.use(bodyParser.json());
app.use(cors());

const dbURI = 'mongodb://127.0.0.1:27017/test';

mongoose.connect(dbURI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((error) => console.error('Connection error', error));


const testSchema = new mongoose.Schema({
    _id: { type: Number },
    testTitle: { type: String },
    testDescription: { type: String },
    testInstructions: { type: String },
    questionType: { type: String },
    languageTag: String,
    additionalData: {
        numberOfOptions: { type: Number },
        style: { type: String },
        customLabels: { type: [String] }
    },
    questions: [
        {
            question: {type: String },
            options: [{
                optionText: { type: String },
                optionValue: { type: Number }
            }]
        }
    ],
    gradingMethod: {
        calculationMethod: { type: String },
        questionsToGroup: { type: String },
        groups: [
            {
                groupID: { type: Number },
                groupName: { type: String },
                groupQuestions: { type: [Number] }
            }
        ]
    },
    sortingMethod: { type: String },
    feedback: {
        feedbackShowMethod: { type: String },
        feedbacks: [
            {
                groupID: { type: Number },
                text: { type: String }
            }
        ]
    }
});

const presetTestSchema = new mongoose.Schema({
    _id: Number,
    testTitle: String,
    route: String,
    testDescription: String,
    languageTag: String,
    questions: [],
    results: []
});

const counterSchema = new mongoose.Schema({
    _id: { type: String },
    sequence_value: { type: Number }
});

const CounterModel = mongoose.model('Counter', counterSchema, 'counters');

const testsModel = mongoose.model('Test', testSchema, "AddedTests");
const presetTestsModel = mongoose.model('PresetTests', presetTestSchema, 'PresetTests');

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


app.post('/tests', async (req, res) => {
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

app.listen(port);
