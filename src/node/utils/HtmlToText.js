exports.EtherpadHtmlToText = {
  format: {
    unorderedList: function(elem, fn, options){
      var h = fn(elem.children, options);
      if(elem.attribs && (elem.attribs.class === 'indent')){
        return '    ' + h + '\n';
      }else{
        return h;
      }
    }
  },
  wordwrap: 130
}
