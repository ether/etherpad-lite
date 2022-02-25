var collectContentPre = function(hook, context){
  var cls = context.cls;
  var tname = context.tname;
  var state = context.state; 
  var lineAttributes = state.lineAttributes

  if(cls !== null) {
    var tagIndex = cls.indexOf("checklist-not-done");
    if(tagIndex === 0){
      lineAttributes['checklist-not-done'] = tags[tagIndex];
    }

    var tagIndex = cls.indexOf("checklist-done");
    if(tagIndex !== -1){
      lineAttributes['checklist-done'] = 'checklist-done';
    }

    if(tname === "div" || tname === "p"){
      delete lineAttributes['checklist-done'];
      delete lineAttributes['checklist-not-done'];
    }
  }
};

var collectContentPost = function(hook, context){
  var cls = context.cls;
  var tname = context.tname;
  var state = context.state;
  var lineAttributes = state.lineAttributes

  var tagIndex = cls.indexOf("checklist-not-done");
  if(tagIndex >= 0){
    delete lineAttributes['checklist-not-done'];
  }

  var tagIndex = cls.indexOf("checklist-done");       
  if(tagIndex >= 0){
    delete lineAttributes['checklist-done'];
  }
};

exports.collectContentPre = collectContentPre;
exports.collectContentPost = collectContentPost;
