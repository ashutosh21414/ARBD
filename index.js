// NPMs
const exec = require('child_process').exec;
const cron = require('node-cron');
const csv_parser = require('csv-parser')
const fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const Datastore = require('nedb');
const os = require('os');
const platform = os.platform();


let networInterface = 'wlp2s0';
if (platform === 'darwin') {
  networInterface = 'en0'
} else if (platform === 'linux') {
  networInterface = 'wlp2s0';
}

// Initializations

let userObjects = {};
let presetUsersList = [];
const attendance_records_by_dates = new Datastore({
  filename: './arbd',
  autoload: true
});
const filePath = './attendance_sheets/' + (new Date()).toDateString() + '.csv';





// CSV Processings

var header = [{
  id: 'email',
  title: 'email'
},
{
  id: 'ip',
  title: 'ip'
},
{
  id: 'mac',
  title: 'mac'
},
{
  id: 'lastActiveAt',
  title: 'lastActiveAt'
},
{
  id: 'firstActiveAt',
  title: 'firstActiveAt'
},
{
  id: 'totalTime',
  title: 'totalTime'
},
];

var csvWriter;

function createCSVWriter() {
    return createCsvWriter({
      path: filePath,
      header: header
    });
};

csvWriter = createCSVWriter();


function presetUser() {
  fs.createReadStream('users.csv')
    .pipe(csv_parser())
    .on('data', (data) => presetUsersList.push(data))
    .on('end', () => {
      console.log(presetUsersList);
    });
};


function removePreviousFile() {
  return new Promise(function (resolve, reject) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      resolve();
    } catch (e) {
      console.log(e);
      reject();
    }
  })
}


async function updateCSV(users) {
  attendance_records_by_dates.findOne({
    forDate: (new Date()).toDateString()
  }, async function (err, doc) {
    let dataForCsv = [];
    let dataKeys = Object.keys(doc);
    for (let itr = 0; itr < dataKeys.length; itr++) {
      if (dataKeys[itr].match(/[a-fA-F0-9:]{17}|[a-fA-F0-9]{12}/)) {
        doc[dataKeys[itr]].totalTime = calculateTimeDifference(doc[dataKeys[itr]].firstActiveAt, doc[dataKeys[itr]].lastActiveAt);
        dataForCsv.push(doc[dataKeys[itr]]);
      }
    }

    await removePreviousFile();
    csvWriter = createCSVWriter();
    await csvWriter.writeRecords(dataForCsv)
  });
}


// User specific processings
async function checkStatusOfUsers() {
  console.log(`Scanning on ${networInterface}`);
  var yourscript = exec(`sudo arp-scan --interface=${networInterface} --localnet`,
    async (error, stdout, stderr) => {
      if (error || stderr) {
        console.error(`exec error: ${error}`);
        console.error(`exec stderr ${stderr}`);
      } else {
        let users = stdout.split('\n').filter(a => a).slice(2);
        for (let userItr = 0; userItr < users.length - 2; userItr++) {
          let linesDecoded = (users[userItr]).split('\t');
          let macAddress = linesDecoded[1];
          let ip = linesDecoded[0];

          if (userObjects[macAddress] && userObjects[macAddress].ip) {
            userObjects[macAddress].ip = ip;
            userObjects[macAddress].mac = macAddress;
            userObjects[macAddress].lastActiveAt = [(new Date())];

          } else {
            userObjects[macAddress] = {
              ip: ip,
              mac: macAddress,
              lastActiveAt: (new Date()),
              firstActiveAt: (new Date())
            }
          }
        };


        let validAkUsers = {};
        let toScanFor = presetUsersList.map((user) => user.mac);

        for (let key in userObjects) {
          let userIndex = toScanFor.indexOf(key);
          if (userIndex > -1) {
            validAkUsers[key] = userObjects[key];
            validAkUsers[key].email = presetUsersList[userIndex].email;
          }
        }

        let updateList = {
          forDate: (new Date()).toDateString(),
          ...validAkUsers
        }

        await attendance_records_by_dates.remove({
          forDate: (new Date()).toDateString()
        });

        await attendance_records_by_dates.update({
          forDate: (new Date()).toDateString()
        }, {
          $set: {
            ...updateList
          }
        }, {
          multi: false,
          upsert: true
        });
        console.log('Users', validAkUsers);
        updateCSV();
      }
    });
}


// Utilities
function calculateTimeDifference(previousTime, currentTime) {
  const date1 = (new Date(previousTime)).getTime();
  const date2 = (new Date(currentTime)).getTime();
  const diffTime = Math.abs(date2 - date1);

  return convertToRelativeTime(diffTime);
}


function convertToRelativeTime(ms) {
  const seconds = (ms / 1000).toFixed(1);
  const minutes = (ms / (1000 * 60)).toFixed(1);
  const hours = (ms / (1000 * 60 * 60)).toFixed(1);
  const days = (ms / (1000 * 60 * 60 * 24)).toFixed(1);

  if (seconds < 60) {
    return seconds + " Sec";
  } else if (minutes < 60) {
    return minutes + " Min";
  } else if (hours < 24) {
    return hours + " Hrs";
  } else {
    return days + " Days"
  }
}



// Task Runner 

presetUser();
cron.schedule('*/5 * * * * * *', () => {
  console.log('running a task every 5 seconds');
  checkStatusOfUsers();
});




