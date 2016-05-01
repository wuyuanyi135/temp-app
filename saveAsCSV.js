var csv = require('csv');
var fs = require('fs');
var ws;
var IDs = [];
function _write(ws,data) {
    csv.stringify(
        data,
        (err, out) => {
            ws.write(out);
        }
    );
}
module.exports = {
    isOpened: false,
    start: function (sensorIDs) {
        IDs = sensorIDs;
        ws = fs.createWriteStream('data.csv', {
            flags: 'w',
            defaultEncoding: 'utf8',
            fd: null,
            autoClose: true
        });

        this.isOpened = true;
        _write(ws, [['Time', 'Timestamp', ...sensorIDs]])
    },
    // data is a *object* with ID delimited elements.
    write: function (data) {
        if (data == {}) {
            return;
        }
        var _data = [];
        try {
            var timestamp = data[IDs[0]].timestamp;
            _data.push(new Date(timestamp).toLocaleString());
            _data.push(timestamp);
            for (var i = 0; i < IDs.length; i++) {
                _data.push(data[IDs[i]].value);
            }
            if (this.isOpened) {
                _write(ws,[_data]);
            }
        } catch (e) {
            
        }
    },

    finish: function() {
        this.isOpened = false;
        IDs = [];
        ws.close();
    }
}
