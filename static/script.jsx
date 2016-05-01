

var App = React.createClass({
  updateDeviceList: function() {
    var deviceList = this.state.deviceList;
    var updatedList;
    if (!deviceList) {
      updatedList = this.getInitialState().connectedSensor;
    } else {
      updatedList = [];
      for (var i = 0; i < deviceList.length; i++) {
        updatedList.push(<li key={i}>{deviceList[i]}</li>);
      }
    }

    this.setState({connectedDevice: updatedList});
  },
  recordButtonHandler: function() {
    //this.socket.emit("record",this.state.isRecording);
    $.ajax({
        url: ("/record?start=" + (this.state.isRecording? '0' : '1')),
        method: "post"
    });
  },
  getDefaultProps: function() {
    return {
    };
  },
  getInitialState: function() {
    return {
      backStatus: "",
      connectedDevice: <li>No connection</li>,
      sensorReading: null,
      isRecording: false,
      downloadMessage: null
    };
  },
  componentWillUnmount: function() {
    this.socket.close();
  },
  componentDidMount: function() {

  },
  componentWillMount: function() {

    var socket = this.socket = io('/');

    socket.on('connect', () => {
      this.setState({backStatus:"Connected"})
    });

    socket.on('connect_error', (err) => {
      this.setState({backStatus:`Error: ${err}`});
    });

    socket.on('serverside_state', (state) => {
      this.setState(state)
      this.updateDeviceList();
    });

    socket.on('sensor_data', (data) => {
      // data: [{sensor ID, sensor Value, Timestamp}]
      var sensorReading = [];
      if (!data.length) {
        sensorReading = false;
      } else {
        for (var i = 0; i < data.length; i++) {
          var cur = data[i];
          sensorReading.push(
            <tr key={i}>
              <td>{cur.id}</td>
              <td>{cur.value}</td>
              <td>{cur.timestamp}</td>
              <td>{new Date(cur.timestamp).toLocaleTimeString('en-US', { hour12: false })}</td>
            </tr>
          );
        }
      }
      var table = (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Value</th>
              <th>Timestamp</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {sensorReading}
          </tbody>
        </table>
      );

      this.setState({sensorReading:table});
    });
  },
  render: function() {
    return (
      <div>
        <h1>Sensor Overview Page</h1>
        <h2>Backend Status</h2>
        <p>Connection state: {this.state.backStatus}</p>
        <p>Server state: {this.state.serverBackStatus}</p>
        <h2>Connected Devices</h2>
        <ul>{this.state.connectedDevice}</ul>
        <h2>Sensor Readings</h2>
        {this.state.sensorReading? this.state.sensorReading : <p>No Sensor</p>}
        <h2 className={this.state.isRecording?"recording":null}>{this.state.isRecording? "Recording" : "Record"}</h2>
        { this.state.isRecording? <p>Record started at {new Date(this.state.recordStart).toLocaleString()} <br/>Time lapse: {(Date.now() - this.state.recordStart)/1000} seconds</p> : null}
        <input type="button" value={this.state.isRecording?"Stop":"Start"} onClick={this.recordButtonHandler}/>
        <h2>Download Result</h2>
        <form action="/download" target="_blank">
          <input type="submit" value="Download"/>
        </form>
    </div>
    );
  }
});

ReactDOM.render(
  <App/>,
  document.querySelector("#container")
)
