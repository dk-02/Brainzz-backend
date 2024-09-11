const mongoose = require("mongoose");

const testSchema = new mongoose.Schema({
    _id: { type: Number },
    testTitle: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
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

const testsModel = mongoose.model('Test', testSchema, "AddedTests");

module.exports = testsModel;
