/**
 * @author Mami Nomura (mnomura@convio.com)
 * @version $Id: editor_plugin_src.js,v 1.13 2011/09/15 21:44:22 mpih Exp $
 *
 * Handles uploading file.
 * If user upload non-html file (except plain text), alert error.
 * 
 */

var FileUploadPlugin = {
  createControl : function(n, cm) {
    return null;
  },

  getInfo : function() {
    return {
      longname : 'CMS Upload plugin',
      author : 'Mami Nomura (mnpmura@convio.com)',
      authorurl : 'http://www.convio.com',
      infourl : 'http://twiki.convio.com/twiki/bin/view/Engineering/CmsMcePlugins',
      version : "1.0"
    };
  },

  /**
   * Initializes the plugin, this will be executed after the plugin has been created.
   * This call is done before the editor instance has finished it's initialization so use the onInit event
   * of the editor instance to intercept that event.
   *
   * @param {tinymce.Editor} ed Editor instance that the plugin is initialized in.
   * @param {string} url Absolute URL to where the plugin is located.
   */
  init : function(ed, url) {
    var th = this;
    this._url = url;

    ed.addCommand('CMSShowUploadDialog', function() {
        th._showUploadDialog(ed, null, null, null);
      });

    ed.addButton('cms_upload', {
        title: 'Upload HTML Document',
        cmd: 'CMSShowUploadDialog',
        image: url + '/img/upload.gif'
    });
  },

  /**
   * Pops open a modal dialog to upload a new file.
   * After the file is selected, the dialog is closed.
   * If the text has additional images to upload, then an new upload dialog will be opened.
   *
   * @param editor The editor
   */
  _showUploadDialog : function(editor, imageList, tmpFile, errorMessage) {
    var folderID = editor.getParam('cmsFolderID');
    var dialogPath = this._url + '/upload-new.jsp?folderID=' + folderID;

    var th = this;

    var callback = {
      authenticate: true,
      init: function(o) {
        if (errorMessage) {
          document.getElementById("errors-file").innerHTML = errorMessage;  
          YAHOO.convio.dialog.redraw();
        } else {
          if (imageList) {
            th._doImages(imageList, tmpFile);
          }
        }
      },
      validate: function(o) {
        var data = YAHOO.convio.dialog.getFormData();
        if (! data.file && data.fileLocation == "") {
          YAHOO.convio.dialog.addError("file", "No file was uploaded.  Please try again or cancel.");
        }
      },
      process: function(o) {
        var result = "ok";
        var content = '';
        var hasScript = false;
        var imgList, tmpFile;

        try {
          // Parsing json object which contains html tag will cause error.
          // if that happens, we use responseText directly.
          var response = YAHOO.lang.JSON.parse(o.responseText);
          result = response.resultCode;
          hasScript = response.hasScript;
          imgList = response.imageList;
          tmpFile = response.tmpFile;
        } catch (e) {
          // The final upload content response is text/xml instead of text/json.
          // Catch the error and just use o.responseXML for the new body content.
          // Note: Using o.responseText strips out HTML markup.
          content = o.responseXML.body.innerHTML;
        }

        if (hasScript) {
          var msg = "The file you uploaded contains JavaScript.  If you encounter errors while editing or viewing the content, you may need to remove or adjust event handlers and other script elements.";
          if (! confirm(msg)) {
            return;
          }
        }

        switch (result) {
        case "nottext": 
          //UploadDialog._doInvalidType();
          var errorMessage ="This file is not a text file. To bring the contents of this file into the editor, please open it in its original application and do one of the following:  <ol> <li>save the document as HTML file and upload the converted file. </li><li>copy and paste directly into the editor. </li></ol>";
          th._showUploadDialog(editor, null, null, errorMessage);
                  
          break;
        case "images":                    
          // File contains image link with relative path                  
          th._showUploadDialog(editor, imgList, tmpFile, null);
          break;
        case "ok":
          editor.setContent(content);
          break;
        default:
          alert("Failed to upload file. Invalid result code.");
        }
      },
      failure: function(o) {
	YAHOO.convio.dialog.showError({
          msg: "File size exceeds limit for upload", 
          detail: 'Please select smaller image to upload.'
        });
      }, 
      timeout: 100000,
      cache: false,
      argument: [] 
    };

    YAHOO.convio.dialog.open(dialogPath, callback);
  },
      
  /** 
   * Create image list.
   * @param imageList
   */
  _doImages : function(imageList, tmpFile) {
    // we already know which file to upload. just hide it
          
    document.getElementById("fileBody").style.display="none";             
    document.getElementById("fileHeader").style.display="none";           
    document.getElementById("fileLocation").value = tmpFile;
          
          
    document.getElementById("imageHead").style.display = "block";
    var imageBody = document.getElementById("imageBody");
    imageBody.style.display = "block";
    var imageTable = document.getElementById("imageTable").firstChild;
              
    var i = 0;
    tinymce.each(imageList, function(imageSrc) {                        
        var labelRow = document.createElement("TR");
        labelRow.className = "element";
                        
        var labelCell = document.createElement("TH");
        //labelCell.colSpan = 2;
        labelCell.innerHTML = (i + 1) + ". " + imageSrc;
        labelRow.appendChild(labelCell);
                        
        imageTable.appendChild(labelRow);

        var inputRow = document.createElement("TR");
        inputRow.className = "element";
                        
        var inputCell = document.createElement("TD");
        //inputCell.colSpan = 2;
        inputCell.innerHTML = "<input type='file' id='image" + i + "' name='image" + i + 
          "' style='width:400px'><input type='hidden' id='imgsrc"+ i+"' name='imgsrc" + i +
          "'>";         
        inputRow.appendChild(inputCell);
                        
        imageTable.appendChild(inputRow);
        document.getElementById('imgsrc'+i).value = imageSrc;           
        i++;          
      });      
              
    document.getElementById('imageCount').value = imageList.length;      
  }
    
};   
// Register plugin
tinymce.create('tinymce.plugins.CMSUploadPlugin', FileUploadPlugin);
tinymce.PluginManager.add('cms_upload', tinymce.plugins.CMSUploadPlugin);
