function init() {
  setInterval(function() {
    getStatsCommon();
  }, 2000);

  var daysTab = new TypeTable(0);
  var hoursTab = new TypeTable(1);

  setInterval(function() {
    daysTab.show(); 
    hoursTab.show();
  }, 5000);
}

function getStatsCommon() {
  $.ajax({
      url: '/stats/common',
      type: 'GET',
      success: function(data){
        refreshStats(data);
      },
      error: function() {
      }  
  });
}

function refreshStats(data) {
  if (!data)
    return;
  $('#received').text(data.received);
  $('#sent').text(data.sent);
  $('#errors').text(data.errors);
}

function TypeTable(type) {
  //type:
  //0 - days
  //1 - hours
  this.type = type || 0;
  this.typeString = (this.type==0)?'daily':'hourly';
  this.tableId = (this.type==0)?'#tabDays':'#tabHours';
  this.columns = (this.type==0)?7:24;

  $(this.tableId).html('...loading...');
}

TypeTable.prototype.show = function() {
  var _this = this;
  this.getData( _this.typeString, function(data) {_this.redraw(data)} );
}

TypeTable.prototype.getData = function(type, fn) {
  $.ajax({
      url: '/stats/types/'+type,
      type: 'GET',
      success: function(data){
        fn(data);
      },
      error: function() {
      }  
  });
}

TypeTable.prototype.redraw = function(data) {
  var now = new Date();
  var adjDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var adjHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
  
  var arrMil = [];

  var tabDays = $(this.tableId).empty();
  var count = 1;

  adjDay.setDate(adjDay.getDate()-6);
  adjHour.setHours(adjHour.getHours()-23);
  this.addRow(this.tableId, this.columns, true);

  for (var i=2; i<=(this.columns+1); i++) {
    
    switch (this.type) {
      case 0:
        $(this.tableId + ' tbody tr:nth-child(1) th:nth-child('+i+')').text(adjDay.getDate() + 
        '.' + (adjDay.getMonth().length==2?adjDay.getMonth():'0'+adjDay.getMonth()) );

        arrMil.push(adjDay.getTime());
        adjDay.setDate(adjDay.getDate()+1);
        break;
      case 1:
        $(this.tableId + ' tbody tr:nth-child(1) th:nth-child('+i+')').text(adjHour.getHours() + 
        ':' + '00');

        arrMil.push(adjHour.getTime());
        adjHour.setHours(adjHour.getHours()+1);
        break;  
    }
  }  

  for (var type in data) {
    this.addRow(this.tableId, this.columns);
    $(this.tableId + ' tbody tr:nth-child('+ (count+1) +') td:nth-child(1)').text(type);
    
    for (var time in data[type]) {
      var tdPos = arrMil.indexOf(Number(time));

      if (tdPos != -1) {
        $(this.tableId + ' tbody tr:nth-child('+ (count+1) +') td:nth-child(' + (tdPos+2) + ')').text(data[type][time]);
      }  
    }      
    count++;
  }
}

TypeTable.prototype.addRow = function(id, col, isHeader) {
  var html = '<tr>';
  for (var i=0; i <= col; i++) {
    if (isHeader) {
      html += '<th></th>';
    } else {
      html += '<td></td>';
    }  
  }

  html += '</tr>';
  $(id).append(html);  
}