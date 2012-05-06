module.exports.parse_params = function(req) {
  function isEmpty(obj) {
    for(var prop in obj) {
        if(obj.hasOwnProperty(prop))
            return false;
    }
    return true;
  }

  return isEmpty(req.query)?req.body:req.query;
}