const express = require('express');
const serverless = require('serverless-http');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const port = 3001;

app.use(cors());
app.use(bodyParser.json());

// Save new test data
app.post('/save-test', (req, res) => {
    const testName = generateRoute(req.body.testTitle);
    const filePath = path.join(__dirname, 'customTests', `${testName}.json`);

    if (fs.existsSync(filePath)) {
        return res.status(400).send('Test with the same name already exists');
    }

    const testData = JSON.stringify(req.body);

    fs.writeFile(filePath, testData, (err) => {
        if (err) {
            return res.status(500).send('Failed to save test data');
        }
        res.send('Test data saved successfully');
    });
});

// Load data for specific preset test
app.get('/presetTests/:testTitle', (req, res) => {
    const testTitle = req.params.testTitle;
    const filePath = path.join(__dirname, 'presetTests', `${testTitle}.json`);

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).send('Failed to load test data');
        }
        res.send(JSON.parse(data));
    });
});

// Load data for specific custom test
app.get('/customTests/:testTitle', (req, res) => {
    const testTitle = req.params.testTitle;
    const filePath = path.join(__dirname, 'customTests', `${testTitle}.json`);

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).send('Failed to load test data');
        }
        res.send(JSON.parse(data));
    });
});



// Load data for all presetTests
app.get('/presetTests', (req, res) => {
    const testDirPath = path.join(__dirname, 'presetTests');

    fs.readdir(testDirPath, (err, files) => {
        if (err) {
            return res.status(500).send('Failed to load test data');
        }

        // Filter just JSON files
        const jsonFiles = files.filter(file => file.endsWith('.json'));

        const tests = [];

        jsonFiles.forEach(file => {
            const filePath = path.join(testDirPath, file);
            const fileData = fs.readFileSync(filePath, 'utf8');
            const jsonData = JSON.parse(fileData);

            const testSummary = {
                name: jsonData.name,
                route: jsonData.route,
                description: jsonData.description
            };

            tests.push(testSummary);
        });


        res.json(tests);
    });
});


const generateRoute = (testName) => {
    if (!testName) {
        return "";
    }
    return testName.replace(/\s+/g, '-');
};

// Load data for all custom tests
app.get('/customTests', (req, res) => {
    const testDirPath = path.join(__dirname, 'customTests');

    fs.readdir(testDirPath, (err, files) => {
        if (err) {
            return res.status(500).send('Failed to load test data');
        }
        // Filter just JSON files
        const jsonFiles = files.filter(file => file.endsWith('.json'));

        const tests = [];

        jsonFiles.forEach(file => {
            const filePath = path.join(testDirPath, file);
            const fileData = fs.readFileSync(filePath, 'utf8');
            const jsonData = JSON.parse(fileData);
            // Generate route from test name
            const route = generateRoute(jsonData.testTitle);

            const testSummary = {
                name: jsonData.testTitle,
                route: route,
                description: jsonData.testDescription
            };

            tests.push(testSummary);
        });


        res.json(tests);
    });
});


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

module.exports = app;
