
const DATABASE_URL = 'https://sunset-a749.restdb.io/rest/donations';
const USERS_TABLE = 'users';
const DAY_TABLE = 'day';

//// Get key

let apikey = null;

if(apikey == null) {
  let key = $.cookie('apikey');
  console.log(key);
  if(!key) {
    key = prompt('Put your key');
    if(key && key != ""){
      $.cookie('apikey', key);
      console.log($.cookie('apikey'));
      apikey = key;
    }
  } else {
    apikey = key;
  }
}

let timespan = document.querySelector('#time');
function updateTime() {
  let date = new Date();
  let hours = date.getHours().toString().padStart(2, '0');
  let minutes = date.getMinutes().toString().padStart(2, '0');
  let seconds = date.getSeconds().toString().padStart(2, '0');
  let time = hours + ":" + minutes + ":" + seconds;
  timespan.innerHTML = time;
}
let timeInterval = setInterval(updateTime, 500);


let persisted_data = null;

let database = null;


function constructLocalTable (name) {
  return {
    name: name,
    entries: [],
  };
}



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
  save: function(entry) {
    console.log("saving", entry);
    $.ajax({
      type: "POST",
      url: DATABASE_URL,
      contentType: "application/json",
      data: JSON.stringify(entry)
    }).done(function(result) {
      console.log("Saved", result);
      entry._id = result._id;
    });
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

  obj['date'] = /*new Date();*/getToday();
  return obj;
}

function getToday() {
  /*let date = new Date();
  const day = date.getDate().toString().padStart(2, 0);
  const month = (date.getMonth() + 1).toString().padStart(2, 0);
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;*/
  let utcDate = new Date(); 
  return new Date(utcDate.toDateString());
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
      console.log(e);
      obj_csv.size = e.total;
      obj_csv.dataFile = e.target.result;
      console.log(obj_csv.dataFile);
      let rawData = parseData(obj_csv.dataFile);
      
      let titleRow = rawData[0];
      rawData = rawData.slice(1);
      let data = [];

      rawData.forEach((entry) => {
        let e = constructEntry(titleRow, entry)
        data.push(e);
      })

      persisted_data = data;
      showTable(titleRow, data, 'Preview');
    }
  } 
}

document.querySelector("#acero-button").addEventListener('click', aceroHandler);

function aceroHandler(){
  let titleRow = ['User', 'date', 'gold', 'acero', 'cobre', 'energia'];

  if(!database) {
    getDatabase();
    setTimeout(aceroHandler, 500);
    return;
  }
  
  let name = prompt('Put the name to search');
  let result = selectFrom(name);

  showTable(titleRow, result, 'Result');
  showChart(titleRow, result);
}

function getDatabase() {
  storage.fetch((data) => {
    console.log('fetched?', data);
    database = data;
  });
}

document.querySelector("#output-button").addEventListener('click', () => {
  let titleRow = ['User', 'date', 'gold', 'acero', 'cobre', 'energia'];

  storage.fetch((data) => {
    console.log('fetched?', data);
    showTable(titleRow, data, 'Database');
    database = data;
  });

});

document.querySelector("#input-button").addEventListener('click', inputHandler);

function inputHandler () {
//Use persisted data and upload everything new
  if(!database){
    getDatabase();
    setTimeout(inputHandler, 500);
    return;
  }

  if(persisted_data) {
    // TODO: Make each entry try to match a entry in database (so we don't have duplicates?), keys user/day
    persisted_data.forEach((entry) => {

      if(isInDatabase(entry)){
        console.log('entry in database!')
        return;
      }

      storage.save(entry);
      database.push(entry);
    });

    persisted_data = null;
  }
}

function isInDatabase(entry) {
  for(let i = 0; i < database.length; i++) {
    const sameName = database[i]['User'] === entry['User'];
    const sameDate = new Date(database[i]['date']).getTime() == new Date(entry['date']).getTime(); // need to check this
    
    if(sameDate && sameName) {
      return true;
    }
  }
  return false;
}


function parseData(data) {
  let csvData = [];
  let lbreak = data.split("\n");
  lbreak.forEach(res => {
    res = res.replace('\r', '');
    csvData.push(res.split(","));
  });
  return csvData;
}

function showChart() {
  
}

function selectFrom(name) {

  let result = null;
  if(database) {
    result = database.filter((item) => {
      return item['User'] == name;
    });
  }

  return result;
}

function showTable(titleRow, entries, name) {
  let output = document.querySelector("#output-table");
  output.classList = 'text-center';
  output.innerHTML = '';
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