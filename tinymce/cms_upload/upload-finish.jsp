<%--
 $Source: /home/cvs/cvsroot/cms/integration/web/system/components/convio/tiny_mce/plugins/cms_upload/upload-finish.jsp,v $
 $Author: mpih $
 $Revision: 1.3 $
 $Date: 2011/09/14 23:50:39 $
--%>

<%@ page contentType="text/html; charset=UTF-8"
         import="com.frontleaf.content.DataFile,
                 com.frontleaf.content.ExtendedType,
                 com.frontleaf.content.Folder,
                 com.frontleaf.content.HTMLText,
                 com.frontleaf.content.MimeType,
                 com.frontleaf.content.Type,
                 com.frontleaf.image.Image,
                 com.frontleaf.parser.*,
                 com.frontleaf.request.MultiPartRequestData,
                 com.frontleaf.security.User,
                 com.frontleaf.util.Assert,
                 com.frontleaf.util.FileTools,
                 com.frontleaf.util.PathTools,
                 com.frontleaf.util.StringTools,
                 com.frontleaf.util.TempFile,
                 com.frontleaf.util.XMLWriter,
                 java.io.File,
                 java.text.DateFormat,
                 java.text.SimpleDateFormat,
                 java.util.Date,
                 java.util.Iterator,
                 java.util.Map,
                 java.util.Set,
                 java.util.TreeMap,
                 java.util.logging.Logger,
                 javax.servlet.http.HttpServletRequest,
                 org.json.JSONObject,
                 org.json.JSONArray" %>

<%@ taglib uri="http://www.frontleaf.com/tlds/request-tags-1.0" prefix="rc" %>

<rc:request>
  <parameter name="folderID" type="folder"/>
  <parameter name="imageCount" type="integer"/>
  <parameter name="fileLocation" type="string" required="false"/>
</rc:request>

<%!
  private static final Logger log = Logger.getLogger("com.frontleaf.upload");

  private static class ImgHandler extends DefaultElementHandler {

    private TreeMap imgs;
    private HttpServletRequest request;
    private Folder folder;

    public ImgHandler(HttpServletRequest request, Folder folder, TreeMap imgs) {
      this.imgs = (imgs == null) ? new TreeMap() : imgs;
      this.request = request;
      this.folder = folder;
    }

    public void attributes(String tagName, AttributeList attributes) {
      Attribute attribute = attributes.getAttribute("src");
      if (attribute == null) {
        return;
      }

      String url = attribute.getValue();

      if (url == null || url.startsWith("http://") || url.startsWith("https://")) {
        return;
      }

      if (!imgs.containsKey(url)) {
        imgs.put(url, null);
      } else {
        Image image = (Image) imgs.get(url);
        if (image != null) {
          attribute.setValue(image.getURL());
        }
      }
    }

    public Set getImages() {
      return imgs.keySet();
    }
  }
%>

<%
  final User user = (User) request.getUserPrincipal();

  String resultCode = "ok";

  int imageCount = requestData.getInteger("imageCount").intValue();
  String fileLocation = requestData.getString("fileLocation");
        
  TempFile file;  
  if (fileLocation == null ) {
    file = requestData.getFile("file");
    if (!file.getContentType().startsWith("text/")) {
      resultCode = "nottext";
    }
  } else {
    file = new TempFile(new File(fileLocation));            
  }

  Folder folder = (Folder) requestData.getObject("folderID");

  String text = "";
  JSONArray imageList = new JSONArray();
  BodyHandler handler = new BodyHandler();

  if (imageCount == 0) {
    // Check the uploaded content for image references -- they will need
    // to be updated.

    HTMLParser parser = new HTMLParser(file);
    ImgHandler imgHandler = new ImgHandler(request, folder, null);
    handler.addElementHandler("img", imgHandler);
    parser.addHandler(handler);
    parser.parse();
    Set imgs = imgHandler.getImages();

    if (imgs.size() > 0) {
      // Found image references in the uploaded content.

      resultCode = "images";

      // Since temporary uploaded file are not gauranteed to last longer than
      // the request, save uploaded contents to a tmp file somewhere.
      File tmpDir = new File(System.getProperty("java.io.tmpdir"));
      DateFormat f = new SimpleDateFormat("yyyy-MM-dd-HHmmss");
      String name = "mce-upload-" + file.getName() + f.format(new Date()); 
      File newFile = new File(tmpDir, name);
      FileTools.copy(file, newFile);
      FileTools.delete(file);
      file = new TempFile(newFile);

      for (Iterator i = imgs.iterator(); i.hasNext();) {
        imageList.put(i.next());
      }

    } else {
      text = handler.getText();
    }

  } else {
    // Replace images in the uploaded content with the uploaded images.

    ExtendedType type = ExtendedType.getDefault(Type.find("image"), folder.getRoot());
    MultiPartRequestData data = requestData.getMultiPartData();
    TreeMap imgs = new TreeMap();

    for (int i = 0; i < imageCount; i++) {
      TempFile imgFile = data.getFile("image" + i);
      String imgSrc = data.getParameter("imgsrc" + i);

      if (imgFile != null && imgFile.exists() && imgFile.length() > 0) {
        char delimiter = (imgSrc.indexOf('\\') != -1) ? '\\' : '/';
        String extension = PathTools.getExtension(imgSrc,delimiter);
        String imgName = PathTools.getFileName(imgSrc,delimiter);
        MimeType mimeType = MimeType.forExtension(extension);

        if (mimeType.getName().startsWith("image/")) {
          Image image = new Image(folder, type);
          image.setModifyingUser(user);
          image.setName(imgName);
          image.setTitle(imgName);
          image.create();
          image.save(new DataFile(imgFile), mimeType.getName());
          imgs.put(imgSrc, image.getURL());
        }
      }
    }

    HTMLParser parser = new HTMLParser(file);
    parser.addHandler(handler);
    parser.parse();
    text = handler.getText();

    for (Iterator i = imgs.entrySet().iterator(); i.hasNext();) {
      Map.Entry entry = (Map.Entry) i.next();
      text = StringTools.replace(text, (String) entry.getKey(), (String) entry.getValue());
    }

    FileTools.delete(file);
  }

  // For some strange reasons, when text contains html tag, YUI cannot parse the JSON object
  // If status is ok, just return text.
  if ("ok".equals(resultCode)) {          
    out.write(text);
    return;
  }

  response.resetBuffer();
  JSONObject json = new JSONObject();
  json.put("resultCode", resultCode);     
  json.put("hasScript", handler.hasScript());     
  json.put("imageList", imageList);
  json.put("tmpFile", file.getAbsolutePath());    
  out.write(json.toString());
%>