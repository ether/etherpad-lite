describe("import indents functionality", function(){
  beforeEach(function(cb){
    helper.newPad(cb); // creates a new pad
    this.timeout(60000);
  });

  function getinnertext(){
    var inner = helper.padInner$
    var newtext = ""
    inner("div").each(function(line,el){
      newtext += el.innerHTML+"\n"
    })
    return newtext
  }
  function importrequest(data,importurl,type){
    var success;
    var error;
    var result = $.ajax({
      url: importurl,
      type: "post",
      processData: false,
      async: false,
      contentType: 'multipart/form-data; boundary=boundary',
      accepts: {
        text: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      },
      data: 'Content-Type: multipart/form-data; boundary=--boundary\r\n\r\n--boundary\r\nContent-Disposition: form-data; name="file"; filename="import.'+type+'"\r\nContent-Type: text/plain\r\n\r\n' + data + '\r\n\r\n--boundary',
      error: function(res){
        error = res
      }
    })
    expect(error).to.be(undefined)
    return result
  }
  function exportfunc(link){
    var exportresults = []
    $.ajaxSetup({
      async:false
    })
    $.get(link+"/export/html",function(data){
      var start = data.indexOf("<body>")
      var end = data.indexOf("</body>")
      var html = data.substr(start+6,end-start-6)
      exportresults.push(["html",html])
    })
    $.get(link+"/export/txt",function(data){
      exportresults.push(["txt",data])
    })
    return exportresults
  }

  xit("import a pad with indents from html", function(done){
    var importurl = helper.padChrome$.window.location.href+'/import'
    var htmlWithIndents = '<html><body><ul class="list-indent1"><li>indent line 1</li><li>indent line 2</li><ul class="list-indent2"><li>indent2 line 1</li><li>indent2 line 2</li></ul></ul></body></html>'
    importrequest(htmlWithIndents,importurl,"html")
    helper.waitFor(function(){
      return expect(getinnertext()).to.be('\
<ul class="list-indent1"><li><span class="">indent line 1</span></li></ul>\n\
<ul class="list-indent1"><li><span class="">indent line 2</span></li></ul>\n\
<ul class="list-indent2"><li><span class="">indent2 line 1</span></li></ul>\n\
<ul class="list-indent2"><li><span class="">indent2 line 2</span></li></ul>\n\
<br>\n')
    })
    var results = exportfunc(helper.padChrome$.window.location.href)
    expect(results[0][1]).to.be('<ul class="indent"><li>indent line 1</li><li>indent line 2</li><ul class="indent"><li>indent2 line 1</li><li>indent2 line 2</li></ul></ul><br>')
    expect(results[1][1]).to.be('\tindent line 1\n\tindent line 2\n\t\tindent2 line 1\n\t\tindent2 line 2\n\n')
    done()
  })

  xit("import a pad with indented lists and newlines from html", function(done){
    var importurl = helper.padChrome$.window.location.href+'/import'
    var htmlWithIndents = '<html><body><ul class="list-indent1"><li>indent line 1</li></ul><br/><ul class="list-indent1"><li>indent 1 line 2</li><ul class="list-indent2"><li>indent 2 times line 1</li></ul></ul><br/><ul class="list-indent1"><ul class="list-indent2"><li>indent 2 times line 2</li></ul></ul></body></html>'
    importrequest(htmlWithIndents,importurl,"html")
    helper.waitFor(function(){
      return expect(getinnertext()).to.be('\
<ul class="list-indent1"><li><span class="">indent line 1</span></li></ul>\n\
<br>\n\
<ul class="list-indent1"><li><span class="">indent 1 line 2</span></li></ul>\n\
<ul class="list-indent2"><li><span class="">indent 2 times line 1</span></li></ul>\n\
<br>\n\
<ul class="list-indent2"><li><span class="">indent 2 times line 2</span></li></ul>\n\
<br>\n')
    })
    var results = exportfunc(helper.padChrome$.window.location.href)
    expect(results[0][1]).to.be('<ul class="indent"><li>indent line 1</li></ul><br><ul class="indent"><li>indent 1 line 2</li><ul class="indent"><li>indent 2 times line 1</li></ul></ul><br><ul><ul class="indent"><li>indent 2 times line 2</li></ul></ul><br>')
    expect(results[1][1]).to.be('\tindent line 1\n\n\tindent 1 line 2\n\t\tindent 2 times line 1\n\n\t\tindent 2 times line 2\n\n')
    done()
  })
  xit("import a pad with 8 levels of indents and newlines and attributes from html", function(done){
    var importurl = helper.padChrome$.window.location.href+'/import'
    var htmlWithIndents = '<html><body><ul class="list-indent1"><li>indent line 1</li></ul><br/><ul class="list-indent1"><li>indent line 2</li><ul class="list-indent2"><li>indent2 line 1</li></ul></ul><br/><ul class="list-indent1"><ul class="list-indent2"><ul class="list-indent3"><ul class="list-indent4"><li><span class="b s i u"><b><i><s><u>indent4 line 2 bisu</u></s></i></b></span></li><li><span class="b s "><b><s>indent4 line 2 bs</s></b></span></li><li><span class="u"><u>indent4 line 2 u</u></span><span class="u i s"><i><s><u>uis</u></s></i></span></li><ul class="list-indent5"><ul class="list-indent6"><ul class="list-indent7"><ul class="list-indent8"><li><span class="">foo</span></li><li><span class="b s"><b><s>foobar bs</b></s></span></li></ul></ul></ul></ul><ul class="list-indent5"><li>foobar</li></ul></ul></ul></ul></body></html>'
    importrequest(htmlWithIndents,importurl,"html")
    helper.waitFor(function(){
      return expect(getinnertext()).to.be('\
<ul class="list-indent1"><li><span class="">indent line 1</span></li></ul>\n\<br>\n\
<ul class="list-indent1"><li><span class="">indent line 2</span></li></ul>\n\
<ul class="list-indent2"><li><span class="">indent2 line 1</span></li></ul>\n<br>\n\
<ul class="list-indent4"><li><span class="b i s u"><b><i><s><u>indent4 line 2 bisu</u></s></i></b></span></li></ul>\n\
<ul class="list-indent4"><li><span class="b s"><b><s>indent4 line 2 bs</s></b></span></li></ul>\n\
<ul class="list-indent4"><li><span class="u"><u>indent4 line 2 u</u></span><span class="i s u"><i><s><u>uis</u></s></i></span></li></ul>\n\
<ul class="list-indent8"><li><span class="">foo</span></li></ul>\n\
<ul class="list-indent8"><li><span class="b s"><b><s>foobar bs</s></b></span></li></ul>\n\
<ul class="list-indent5"><li><span class="">foobar</span></li></ul>\n\
<br>\n')
    })
    var results = exportfunc(helper.padChrome$.window.location.href)
    expect(results[0][1]).to.be('<ul class="indent"><li>indent line 1</li></ul><br><ul class="indent"><li>indent line 2</li><ul class="indent"><li>indent2 line 1</li></ul></ul><br><ul><ul><ul><ul class="indent"><li><strong><em><s><u>indent4 line 2 bisu</u></s></em></strong></li><li><strong><s>indent4 line 2 bs</s></strong></li><li><u>indent4 line 2 u<em><s>uis</s></em></u></li><ul><ul><ul><ul class="indent"><li>foo</li><li><strong><s>foobar bs</s></strong></li></ul></ul></ul><li>foobar</li></ul></ul></ul></ul></ul><br>')
    expect(results[1][1]).to.be('\tindent line 1\n\n\tindent line 2\n\t\tindent2 line 1\n\n\t\t\t\tindent4 line 2 bisu\n\t\t\t\tindent4 line 2 bs\n\t\t\t\tindent4 line 2 uuis\n\t\t\t\t\t\t\t\tfoo\n\t\t\t\t\t\t\t\tfoobar bs\n\t\t\t\t\tfoobar\n\n')
    done()
  })
})
