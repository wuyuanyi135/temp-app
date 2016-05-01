var dataInterval = 1000;

//states
var isRecording = false;
var serverBackStatus = "Normal";
var deviceListObj = {};
var deviceList = [];
var dataListObj = {};
var dataList = [];
var recordStart = null;
var recordFinish = null;

var fs = require('fs');
var saveCSV = require('./saveAsCSV');
var feathers = require('feathers');
var app = feathers();
var server = require('http').Server(app);

var io = require('socket.io')(server);

server.listen(80, () => {
    console.log("Server started");
});

var mqtt = require('mqtt');
var client = mqtt.connect("mqtt://localhost");
client.on('error', (err) => {
    serverBackStatus = err;
    emitServerState();
})

client.on('connect', () => {
    console.log("mqtt connected");

    // device list
    client.subscribe("device/+/status");

    // sensor values
    client.subscribe("device/+/sensor/+");
});

client.on('message', (topic, message) => {
    message = message.toString();

    var statusRe = /device\/(.*)?\/status/;
    var statusResult = statusRe.exec(topic);
    if (statusResult) {
        // handle online/offline msg
        if (message == "on") {
            deviceListObj[statusResult[1]] = 1;
        } else {
            // message == off
            delete deviceListObj[statusResult[1]];
            dataListObj = {};
        }

        updateDeviceList();
        emitServerState();
    }

    var sensorRe = /device\/.*?\/sensor\/(.*)?/;
    var sensorResult = sensorRe.exec(topic);
    if (sensorResult) {
        dataListObj[sensorResult[1]] = {
            value: message,
            timestamp: Date.now()
        }
    }
});

function emitServerState() {
    io.emit("serverside_state", {
        isRecording,
        serverBackStatus,
        deviceList,
        recordStart,
        recordFinish
    });
}

function updateDeviceList() {
    deviceList = Object.keys(deviceListObj);
}

function updateDataList() {
    dataList = [];
    var keys = Object.keys(dataListObj);
    for (var i = 0; i < keys.length; i++) {
        dataList.push(
            Object.assign({}, {
                id: keys[i]
            }, dataListObj[keys[i]])
        );
    }
}

function record(option) {
    isRecording = option;

    if (option) {
        //start recording
        recordFinish = null;
        recordStart = Date.now();
        saveCSV.start(Object.keys(dataListObj));

    } else {
        // stop recording
        recordFinish = Date.now();
        saveCSV.finish();
    }

    emitServerState();
}

io.on('connect', (socket) => {
    //once connected send server side state
    emitServerState();
})

// push sensor data per 1000 ms
setInterval(() => {
    if (saveCSV.isOpened) {
        saveCSV.write(dataListObj);
    }
    updateDataList();
    if (dataList.length) {
        io.emit('sensor_data', dataList);
    } else {
        io.emit('sensor_data',[]);
    }
}, dataInterval);

app.use(feathers.static("static"));
app.post('/record', (req, res) => {
    if (req.query.start == "1") {
        record(true);
    } else {
        record(false);
    }
});

app.get('/download', function(req, res) {
    var path = __dirname + '/data.csv';

    fs.access(path, fs.R_OK, (err) => {
        if (err) {
            res.send("No data present");
        } else {
            var suffix = "";
            if (recordStart) {
                suffix += ' from ' + new Date(recordStart).toLocaleString().replace(/\//g,'-');
            }

            if (recordFinish) {
                suffix+=' to ' + new Date(recordFinish).toLocaleString().replace(/\//g,'-');
            }
            res.download(path,`data${suffix}.csv`);
        }
    });
});
