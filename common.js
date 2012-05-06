exports.getHourMill = function (date) {
  var now = date || new Date();
  var a = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
  return a.getTime();
}
exports.getDayMill = function (date) {
  var now = date || new Date();
  var a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return a.getTime(); 
}