describe("import functionality", function(){
  beforeEach(function(cb){
    helper.newPad(cb); // creates a new pad
    this.timeout(60000);
  });

  function getinnertext(){
    var inner = helper.padInner$
    if(!inner){
      return ""
    }
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

  xit("import a pad with newlines from txt", function(done){
    var importurl = helper.padChrome$.window.location.href+'/import'
    var textWithNewLines = 'imported text\nnewline'
    importrequest(textWithNewLines,importurl,"txt")
    helper.waitFor(function(){
      return expect(getinnertext()).to.be('<span class="">imported text</span>\n<span class="">newline</span>\n<br>\n')
    })
    var results = exportfunc(helper.padChrome$.window.location.href)
    expect(results[0][1]).to.be("imported text<br>newline<br><br>")
    expect(results[1][1]).to.be("imported text\nnewline\n\n")
    done()
  })
  xit("import a pad with newlines from html", function(done){
    var importurl = helper.padChrome$.window.location.href+'/import'
    var htmlWithNewLines = '<html><body>htmltext<br/>newline</body></html>'
    importrequest(htmlWithNewLines,importurl,"html")
    helper.waitFor(function(){
      return expect(getinnertext()).to.be('<span class="">htmltext</span>\n<span class="">newline</span>\n<br>\n')
    })
    var results = exportfunc(helper.padChrome$.window.location.href)
    expect(results[0][1]).to.be("htmltext<br>newline<br><br>")
    expect(results[1][1]).to.be("htmltext\nnewline\n\n")
    done()
  })
  xit("import a pad with attributes from html", function(done){
    var importurl = helper.padChrome$.window.location.href+'/import'
    var htmlWithNewLines = '<html><body>htmltext<br/><span class="b s i u"><b><i><s><u>newline</u></s></i></b></body></html>'
    importrequest(htmlWithNewLines,importurl,"html")
    helper.waitFor(function(){
      return expect(getinnertext()).to.be('<span class="">htmltext</span>\n<span class="b i s u"><b><i><s><u>newline</u></s></i></b></span>\n<br>\n')
    })
    var results = exportfunc(helper.padChrome$.window.location.href)
    expect(results[0][1]).to.be('htmltext<br><strong><em><s><u>newline</u></s></em></strong><br><br>')
    expect(results[1][1]).to.be('htmltext\nnewline\n\n')
    done()
  })
  xit("import a pad with bullets from html", function(done){
    var importurl = helper.padChrome$.window.location.href+'/import'
    var htmlWithBullets = '<html><body><ul class="list-bullet1"><li>bullet line 1</li><li>bullet line 2</li><ul class="list-bullet2"><li>bullet2 line 1</li><li>bullet2 line 2</li></ul></ul></body></html>'
    importrequest(htmlWithBullets,importurl,"html")
    helper.waitFor(function(){
      return expect(getinnertext()).to.be('\
<ul class="list-bullet1"><li><span class="">bullet line 1</span></li></ul>\n\
<ul class="list-bullet1"><li><span class="">bullet line 2</span></li></ul>\n\
<ul class="list-bullet2"><li><span class="">bullet2 line 1</span></li></ul>\n\
<ul class="list-bullet2"><li><span class="">bullet2 line 2</span></li></ul>\n\
<br>\n')
    })
    var results = exportfunc(helper.padChrome$.window.location.href)
    expect(results[0][1]).to.be('<ul class="bullet"><li>bullet line 1</li><li>bullet line 2</li><ul class="bullet"><li>bullet2 line 1</li><li>bullet2 line 2</li></ul></ul><br>')
    expect(results[1][1]).to.be('\t* bullet line 1\n\t* bullet line 2\n\t\t* bullet2 line 1\n\t\t* bullet2 line 2\n\n')
    done()
  })
  xit("import a pad with bullets and newlines from html", function(done){
    var importurl = helper.padChrome$.window.location.href+'/import'
    var htmlWithBullets = '<html><body><ul class="list-bullet1"><li>bullet line 1</li></ul><br/><ul class="list-bullet1"><li>bullet line 2</li><ul class="list-bullet2"><li>bullet2 line 1</li></ul></ul><br/><ul class="list-bullet1"><ul class="list-bullet2"><li>bullet2 line 2</li></ul></ul></body></html>'
    importrequest(htmlWithBullets,importurl,"html")
    helper.waitFor(function(){
      return expect(getinnertext()).to.be('\
<ul class="list-bullet1"><li><span class="">bullet line 1</span></li></ul>\n\
<br>\n\
<ul class="list-bullet1"><li><span class="">bullet line 2</span></li></ul>\n\
<ul class="list-bullet2"><li><span class="">bullet2 line 1</span></li></ul>\n\
<br>\n\
<ul class="list-bullet2"><li><span class="">bullet2 line 2</span></li></ul>\n\
<br>\n')
    })
    var results = exportfunc(helper.padChrome$.window.location.href)
    expect(results[0][1]).to.be('<ul class="bullet"><li>bullet line 1</li></ul><br><ul class="bullet"><li>bullet line 2</li><ul class="bullet"><li>bullet2 line 1</li></ul></ul><br><ul><ul class="bullet"><li>bullet2 line 2</li></ul></ul><br>')
    expect(results[1][1]).to.be('\t* bullet line 1\n\n\t* bullet line 2\n\t\t* bullet2 line 1\n\n\t\t* bullet2 line 2\n\n')
    done()
  })
  xit("import a pad with bullets and newlines and attributes from html", function(done){
    var importurl = helper.padChrome$.window.location.href+'/import'
    var htmlWithBullets = '<html><body><ul class="list-bullet1"><li>bullet line 1</li></ul><br/><ul class="list-bullet1"><li>bullet line 2</li><ul class="list-bullet2"><li>bullet2 line 1</li></ul></ul><br/><ul class="list-bullet1"><ul class="list-bullet2"><ul class="list-bullet3"><ul class="list-bullet4"><li><span class="b s i u"><b><i><s><u>bullet4 line 2 bisu</u></s></i></b></span></li><li><span class="b s "><b><s>bullet4 line 2 bs</s></b></span></li><li><span class="u"><u>bullet4 line 2 u</u></span><span class="u i s"><i><s><u>uis</u></s></i></span></li></ul></ul></ul></ul></body></html>'
    importrequest(htmlWithBullets,importurl,"html")
    helper.waitFor(function(){
      return expect(getinnertext()).to.be('\
<ul class="list-bullet1"><li><span class="">bullet line 1</span></li></ul>\n\<br>\n\
<ul class="list-bullet1"><li><span class="">bullet line 2</span></li></ul>\n\
<ul class="list-bullet2"><li><span class="">bullet2 line 1</span></li></ul>\n<br>\n\
<ul class="list-bullet4"><li><span class="b i s u"><b><i><s><u>bullet4 line 2 bisu</u></s></i></b></span></li></ul>\n\
<ul class="list-bullet4"><li><span class="b s"><b><s>bullet4 line 2 bs</s></b></span></li></ul>\n\
<ul class="list-bullet4"><li><span class="u"><u>bullet4 line 2 u</u></span><span class="i s u"><i><s><u>uis</u></s></i></span></li></ul>\n\
<br>\n')
    })
    var results = exportfunc(helper.padChrome$.window.location.href)
    expect(results[0][1]).to.be('<ul class="bullet"><li>bullet line 1</li></ul><br><ul class="bullet"><li>bullet line 2</li><ul class="bullet"><li>bullet2 line 1</li></ul></ul><br><ul><ul><ul><ul class="bullet"><li><strong><em><s><u>bullet4 line 2 bisu</u></s></em></strong></li><li><strong><s>bullet4 line 2 bs</s></strong></li><li><u>bullet4 line 2 u<em><s>uis</s></em></u></li></ul></ul></ul></ul><br>')
    expect(results[1][1]).to.be('\t* bullet line 1\n\n\t* bullet line 2\n\t\t* bullet2 line 1\n\n\t\t\t\t* bullet4 line 2 bisu\n\t\t\t\t* bullet4 line 2 bs\n\t\t\t\t* bullet4 line 2 uuis\n\n')
    done()
  })
  xit("import a pad with nested bullets from html", function(done){
    var importurl = helper.padChrome$.window.location.href+'/import'
    var htmlWithBullets = '<html><body><ul class="list-bullet1"><li>bullet line 1</li></ul><ul class="list-bullet1"><li>bullet line 2</li><ul class="list-bullet2"><li>bullet2 line 1</li></ul></ul><ul class="list-bullet1"><ul class="list-bullet2"><ul class="list-bullet3"><ul class="list-bullet4"><li>bullet4 line 2</li><li>bullet4 line 2</li><li>bullet4 line 2</li></ul><li>bullet3 line 1</li></ul></ul><li>bullet2 line 1</li></ul></body></html>'
    importrequest(htmlWithBullets,importurl,"html")
    var oldtext=getinnertext()
    helper.waitFor(function(){
      return oldtext != getinnertext()
//      return expect(getinnertext()).to.be('\
//<ul class="list-bullet1"><li><span class="">bullet line 1</span></li></ul>\n\
//<ul class="list-bullet1"><li><span class="">bullet line 2</span></li></ul>\n\
//<ul class="list-bullet2"><li><span class="">bullet2 line 1</span></li></ul>\n\
//<ul class="list-bullet4"><li><span class="">bullet4 line 2</span></li></ul>\n\
//<ul class="list-bullet4"><li><span class="">bullet4 line 2</span></li></ul>\n\
//<ul class="list-bullet4"><li><span class="">bullet4 line 2</span></li></ul>\n\
//<br>\n')
    })

    var results = exportfunc(helper.padChrome$.window.location.href)
    expect(results[0][1]).to.be('<ul class="bullet"><li>bullet line 1</li><li>bullet line 2</li><ul class="bullet"><li>bullet2 line 1</li><ul><ul class="bullet"><li>bullet4 line 2</li><li>bullet4 line 2</li><li>bullet4 line 2</li></ul><li>bullet3 line 1</li></ul></ul><li>bullet2 line 1</li></ul><br>')
    expect(results[1][1]).to.be('\t* bullet line 1\n\t* bullet line 2\n\t\t* bullet2 line 1\n\t\t\t\t* bullet4 line 2\n\t\t\t\t* bullet4 line 2\n\t\t\t\t* bullet4 line 2\n\t\t\t* bullet3 line 1\n\t* bullet2 line 1\n\n')
    done()
  })
  xit("import a pad with 8 levels of bullets and newlines and attributes from html", function(done){
    var importurl = helper.padChrome$.window.location.href+'/import'
    var htmlWithBullets = '<html><body><ul class="list-bullet1"><li>bullet line 1</li></ul><br/><ul class="list-bullet1"><li>bullet line 2</li><ul class="list-bullet2"><li>bullet2 line 1</li></ul></ul><br/><ul class="list-bullet1"><ul class="list-bullet2"><ul class="list-bullet3"><ul class="list-bullet4"><li><span class="b s i u"><b><i><s><u>bullet4 line 2 bisu</u></s></i></b></span></li><li><span class="b s "><b><s>bullet4 line 2 bs</s></b></span></li><li><span class="u"><u>bullet4 line 2 u</u></span><span class="u i s"><i><s><u>uis</u></s></i></span></li><ul class="list-bullet5"><ul class="list-bullet6"><ul class="list-bullet7"><ul class="list-bullet8"><li><span class="">foo</span></li><li><span class="b s"><b><s>foobar bs</b></s></span></li></ul></ul></ul></ul><ul class="list-bullet5"><li>foobar</li></ul></ul></ul></ul></body></html>'
    importrequest(htmlWithBullets,importurl,"html")
    helper.waitFor(function(){
      return expect(getinnertext()).to.be('\
<ul class="list-bullet1"><li><span class="">bullet line 1</span></li></ul>\n\<br>\n\
<ul class="list-bullet1"><li><span class="">bullet line 2</span></li></ul>\n\
<ul class="list-bullet2"><li><span class="">bullet2 line 1</span></li></ul>\n<br>\n\
<ul class="list-bullet4"><li><span class="b i s u"><b><i><s><u>bullet4 line 2 bisu</u></s></i></b></span></li></ul>\n\
<ul class="list-bullet4"><li><span class="b s"><b><s>bullet4 line 2 bs</s></b></span></li></ul>\n\
<ul class="list-bullet4"><li><span class="u"><u>bullet4 line 2 u</u></span><span class="i s u"><i><s><u>uis</u></s></i></span></li></ul>\n\
<ul class="list-bullet8"><li><span class="">foo</span></li></ul>\n\
<ul class="list-bullet8"><li><span class="b s"><b><s>foobar bs</s></b></span></li></ul>\n\
<ul class="list-bullet5"><li><span class="">foobar</span></li></ul>\n\
<br>\n')
    })
    var results = exportfunc(helper.padChrome$.window.location.href)
    expect(results[0][1]).to.be('<ul class="bullet"><li>bullet line 1</li></ul><br><ul class="bullet"><li>bullet line 2</li><ul class="bullet"><li>bullet2 line 1</li></ul></ul><br><ul><ul><ul><ul class="bullet"><li><strong><em><s><u>bullet4 line 2 bisu</u></s></em></strong></li><li><strong><s>bullet4 line 2 bs</s></strong></li><li><u>bullet4 line 2 u<em><s>uis</s></em></u></li><ul><ul><ul><ul class="bullet"><li>foo</li><li><strong><s>foobar bs</s></strong></li></ul></ul></ul><li>foobar</li></ul></ul></ul></ul></ul><br>')
    expect(results[1][1]).to.be('\t* bullet line 1\n\n\t* bullet line 2\n\t\t* bullet2 line 1\n\n\t\t\t\t* bullet4 line 2 bisu\n\t\t\t\t* bullet4 line 2 bs\n\t\t\t\t* bullet4 line 2 uuis\n\t\t\t\t\t\t\t\t* foo\n\t\t\t\t\t\t\t\t* foobar bs\n\t\t\t\t\t* foobar\n\n')
    done()
  })

  xit("import a pad with ordered lists from html", function(done){
    var importurl = helper.padChrome$.window.location.href+'/import'
    var htmlWithBullets = '<html><body><ol class="list-number1" start="1"><li>number 1 line 1</li></ol><ol class="list-number1" start="2"><li>number 2 line 2</li></ol></body></html>'
    importrequest(htmlWithBullets,importurl,"html")
    -console.error(getinnertext())
    expect(getinnertext()).to.be('\
<ol class="list-number1" start="1"><li><span class="">number 1 line 1</span></li></ol>\n\
<ol class="list-number1" start="2"><li><span class="">number 2 line 2</span></li></ol>\n\
<br>\n')
    var results = exportfunc(helper.padChrome$.window.location.href)
    expect(results[0][1]).to.be('<ol class="list-number1" start="1"><li>number 1 line 1</li></ol><ol class="list-number1" start="2"><li>number 2 line 2</li></ol>')
    expect(results[1][1]).to.be('')
    done()
  })
  xit("import a pad with ordered lists and newlines from html", function(done){
    var importurl = helper.padChrome$.window.location.href+'/import'
    var htmlWithBullets = '<html><body><ol class="list-number1" start="1"><li>number 9 line 1</li></ol><br/><ol class="list-number1" start="2"><li>number 10 line 2</li><ol class="list-number2"><li>number 2 times line 1</li></ol></ol><br/><ol class="list-bullet1"><ol class="list-number2"><li>number 2 times line 2</li></ol></ol></body></html>'
    importrequest(htmlWithBullets,importurl,"html")
    expect(getinnertext()).to.be('\
<ol class="list-number1" start="1"><li><span class="">number 9 line 1</span></li></ol>\n\
<br>\n\
<ol class="list-number1" start="2"><li><span class="">number 10 line 2</span></li></ol>\n\
<ol class="list-number2"><li><span class="">number 2 times line 1</span></li></ol>\n\
<br>\n\
<ol class="list-number2"><li><span class="">number 2 times line 2</span></li></ol>\n\
<br>\n')
    var results = exportfunc(helper.padChrome$.window.location.href)
    console.error(results)
    done()
  })
  xit("import a pad with nested ordered lists and attributes and newlines from html", function(done){
    var importurl = helper.padChrome$.window.location.href+'/import'
    var htmlWithBullets = '<html><body><ol class="list-number1" start="1"><li><span class="b s i u"><b><i><s><u>bold strikethrough italics underline</u></s><i/></b></span> line <span class="b"><b>1bold</b></span></li></ol><br/><span class="i"><i><ol class="list-number1" start="2"><li>number 10 line 2</li><ol class="list-number2"><li>number 2 times line 1</li></ol></ol></i></span><br/><ol class="list-bullet1"><ol class="list-number2"><li>number 2 times line 2</li></ol></ol></body></html>'
    importrequest(htmlWithBullets,importurl,"html")
    expect(getinnertext()).to.be('\
<ol class="list-number1"><li><span class="b i s u"><b><i><s><u>bold strikethrough italics underline</u></s></i></b></span><span class=""> line </span><span class="b"><b>1bold</b></span></li></ol>\n\
<br>\n\
<ol class="list-number1"><li><span class="i"><i>number 10 line 2</i></span></li></ol>\n\
<ol class="list-number2"><li><span class="i"><i>number 2 times line 1</i></span></li></ol>\n\
<br>\n\
<ol class="list-number2"><li><span class="">number 2 times line 2</span></li></ol>\n\
<br>\n')
    var results = exportfunc(helper.padChrome$.window.location.href)
    console.error(results)
    done()
  })
})
