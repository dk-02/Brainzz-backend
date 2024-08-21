const mongoose = require("mongoose");

const presetTestSchema = new mongoose.Schema({
    _id: Number,
    testTitle: String,
    route: String,
    testDescription: String,
    languageTag: String,
    questions: [],
    results: []
});

const presetTestsModel = mongoose.model('PresetTests', presetTestSchema, 'PresetTests');

module.exports = presetTestsModel;
