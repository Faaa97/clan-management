
const DATABASE_URL = 'https://sunset-a749.restdb.io/rest/donations';
const USERS_TABLE = 'users';
const DAY_TABLE = 'day';

google.charts.load('current',{packages:['corechart']});
google.charts.setOnLoadCallback(() => {
  console.log('google charts loaded!');
});

//// Get key

let apikey = null;

if(apikey == null) {
  let key = $.cookie('apikey');
  if(!key) {
    key = prompt('Put your key');
    if(key && key != ""){
      $.cookie('apikey', key);
      apikey = key;
    }
  } else {
    apikey = key;
  }
}

let timespan = document.querySelector('#time');
function updateTime() {
  let date = getUTC8Date();
  let hours = date.getHours().toString().padStart(2, '0');
  let minutes = date.getMinutes().toString().padStart(2, '0');
  let seconds = date.getSeconds().toString().padStart(2, '0');
  let time = hours + ":" + minutes + ":" + seconds;
  timespan.innerHTML = time;
}
let timeInterval = setInterval(updateTime, 500);


let persisted_data = null;

let database = null;

$.ajaxPrefilter(function(options) {
  if (!options.beforeSend) {
    options.beforeSend = function(xhr) {
      xhr.setRequestHeader('x-apikey', apikey);
    }
  }
});

var storage = {
  fetch: function(callback) {
    $.getJSON(DATABASE_URL, function(data) {
      var entries = data;
      entries.forEach((entry, index) => {
        entry.id = index;
      });
      callback(entries);
    });
  },
  save: function(entry, err) {
    console.log("saving", entry);
    $.ajax({
      type: "POST",
      url: DATABASE_URL,
      contentType: "application/json",
      data: JSON.stringify(entry)
    }).done(function(result) {
      console.log("Saved", result);
      // TODO: Show notification that request was successful
      entry._id = result._id;
    }).fail(function(result) {
      err(result);
    })
  },
  update: function(entry) {
    console.log("updating", entry);
    $.ajax({
      type: "PUT",
      url: DATABASE_URL + entry._id,
      contentType: "application/json",
      data: JSON.stringify(todo)
    }).done(function(result) {
      console.log("Updated", result);
    });
  },
  updateAll: function(entries) {
    var saveOne = function(entry, callback) {
      $.ajax({
        type: "PUT",
        url: DATABASE_URL + entry._id,
        contentType: "application/json",
        data: JSON.stringify(entry)
      }).done(function(result) {
        console.log("Updated", result);
        callback(null, result);
      });
    }

    var funcs = [];
    entries.forEach(function(entry) {
      funcs.push(async.apply(saveOne, entry));
    });
    async.parallel(funcs, function(error, result) {
      console.log("updateAll", error, result)
    });
  },
  delete: function(todo) {
    console.log("deleting", todo);
    $.ajax({
      type: "DELETE",
      url: DATABASE_URL + todo._id,
      contentType: "application/json"
    }).done(function(result) {
      console.log("Saved", result);
      todo._id = result._id;
    });
  },
  query: function(query, callback) {
    console.log(DATABASE_URL + query);
    $.getJSON(DATABASE_URL + query.toString() , function(result) {
      console.log("Saved", result);
      callback(result);
      //todo._id = result._id;
    });
  }
}

function constructEntry(format, row) {
  let obj = {};
  format.forEach((entry, index) => {
    obj[entry] = row[index];
  });

  obj['date'] = getToday();
  return obj;
}

function getUTC8Date() {
  let utcDate = new Date();
  utcDate.setHours(utcDate.getHours() + 8);
  return utcDate;
}

function getToday() {
  let utcDate = getUTC8Date();
  utcDate.setHours(0);
  utcDate.setMinutes(0);
  utcDate.setSeconds(0);
  utcDate.setMilliseconds(0);
  return utcDate;
}

function readFile(input) {  
  if (input.files && input.files[0]) {
    let reader = new FileReader();
    reader.readAsBinaryString(input.files[0]);
    reader.onload = function (e) {
      let obj_csv = {
        size:0,
        dataFile:[]
      };    
      obj_csv.size = e.total;
      obj_csv.dataFile = e.target.result;

      let rawData = parseData(obj_csv.dataFile);
      
      let titleRow = rawData[0];
      rawData = rawData.slice(1);
      let data = [];

      rawData.forEach((entry) => {
        let e = constructEntry(titleRow, entry);
        data.push(e);
      })

      persisted_data = data;
      showTable(titleRow, data, 'Preview');
    }
  } 
}

document.querySelector("#acero-button").addEventListener('click', aceroHandler);

function aceroHandler(){
  let titleRow = ['Usuario', 'date', 'oro', 'acero', 'cobre', 'energia'];

  if(!database) {
    getDatabase(() => {
      aceroHandler();
    });
    return;
  }
  
  let name = prompt('Put the name to search');
  let result = selectFrom(name);

  showTable(titleRow, result, 'Result');
  showDarkSteelChart(name, result);
}

function getDatabase(callback) {
  storage.fetch((data) => {
    database = data;
    if(callback) callback(data);
  });
}

document.querySelector("#output-button").addEventListener('click', () => {
  let titleRow = ['Usuario', 'date', 'oro', 'acero', 'cobre', 'energia'];
  getDatabase((data) => {
    showTable(titleRow, data, 'Database');
  });
});

document.querySelector("#input-button").addEventListener('click', inputHandler);

function inputHandler () {
//Use persisted data and upload everything new
  if(!database){
    getDatabase(() => {
      inputHandler();
    });
    return;
  }

  if(persisted_data) {
    persisted_data.forEach((entry) => {

      if(shouldOverrideDate()) {
        entry['date'] = getCustomDate();
      }

      if(isInDatabase(entry)){
        console.log('entry in database! ' + entry);
        return;
      }

      storage.save(entry, (err) => {
        console.log(err);
      });
      database.push(entry);
    });

    persisted_data = null;
    wipeOutputHTML();
  }
}

function getCustomDate() {
  let input = document.querySelector("#input-date");
  return new Date(input.value);
}

function shouldOverrideDate() {
  let checkbox = document.querySelector("#input-date-checkbox");
  return checkbox.value;
}

function isInDatabase(entry) {
  for(let i = 0; i < database.length; i++) {
    const sameName = database[i]['Usuario'] === entry['Usuario'];
    const sameDate = new Date(database[i]['date']).getTime() === new Date(entry['date']).getTime();

    if(sameDate && sameName) {
      return true;
    }
  }
  return false;
}

function parseData(data) {
  let csvData = [];
  let lbreak = data.split("\n");
  lbreak = lbreak.slice(2);
  lbreak[0] = 'Usuario;cobre;acero;energia;oro';
  lbreak = lbreak.slice(0, -3);

  lbreak.forEach((res, index) => {
    res = res.replace('\r', '');
    let split = res.split(";")
    split = split.filter((element, index) => {
      if(index > 5) return false;
      return element != "";
    })

    if(index == 0) {
      csvData.push(split);
      return;
    }

    split = split.map((item, index) => {
      if(index > 0 && index <= 4) {
        return parseInt(item.replace(".", ""));
      }
      return item;
    });
    csvData.push(split);
  });
  return csvData;
}

function showDarkSteelChart(name, data) {

  let resolution = getResolution();

  let options = {
    title: 'Acero oscuro donado por ' + name,
    hAxis: {title: 'Dia'},
    vAxis: {title: 'Acero oscuro'},
    legend: 'none',
    bar: {groupWidth: "35%"},
    width: resolution.width * 0.8,
    height: resolution.height * 0.6,
  };

  let convertedData = new google.visualization.DataTable();
  convertedData.addColumn('date', 'Dia');
  convertedData.addColumn('number', 'Cantidad');

  data.forEach((entry) => {
    convertedData.addRow([new Date(entry['date']), entry['acero']]);
  });

  showColumnChart(options, convertedData);
}

function showColumnChart(options, data) {
  let output = document.querySelector("#output-table");
  makeExtraTitle(output, 'Chart');

  var chart = new google.visualization.ColumnChart(output);
  chart.draw(data, options);
}

function selectFrom(name) {
  let result = null;
  
  if(database) {
    result = database.filter((item) => {
      return item['Usuario'] == name;
    });
  }

  return result;
}

function wipeOutputHTML() {
  let output = document.querySelector("#output-table");
  output.classList = 'text-center';
  output.innerHTML = '';
}

function showTable(titleRow, entries, name) {
  let output = document.querySelector("#output-table");

  makeExtraTitle(output, name);
  let table = document.createElement("table");
  table.classList = "table";

  let thead = document.createElement("thead");
  let tr = document.createElement("tr");

  let th = document.createElement("th");
  th.innerText = '#';
  th.setAttribute('scope', 'col');
  tr.appendChild(th);

  titleRow.forEach((col) => {
    let th = document.createElement("th");
    th.innerText = col;
    th.setAttribute('scope', 'col');
    tr.appendChild(th);
  });

  thead.appendChild(tr);
  table.appendChild(thead);

  let tbody = document.createElement("tbody");
  entries.forEach( (entry, index) => {
    let tr = document.createElement("tr");
    let th = document.createElement("th");
    th.setAttribute('scope', 'row');
    th.innerHTML = index;
    tr.appendChild(th);

    titleRow.forEach((col) => {
      appendColumn(tr, entry[col]);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  output.appendChild(table);
}

function getResolution() {
  return {
    height: window.screen.availHeight,
    width: window.screen.availWidth,
  };
}

function appendColumn(to, data) {
  let td = document.createElement("td");
  td.innerHTML = data;
  to.appendChild(td);
}

function makeExtraTitle(pivot, title) {
  let div = document.createElement('div');
  div.classList = 'h2 center container';
  div.innerHTML = title;
  pivot.appendChild(div);
}