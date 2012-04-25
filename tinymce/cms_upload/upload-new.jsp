<%--
  $Source: /home/cvs/cvsroot/cms/integration/web/system/components/convio/tiny_mce/plugins/cms_upload/upload-new.jsp,v $
  $Author: mpih $
  $Revision: 1.7 $
  $Date: 2011/09/15 21:43:03 $
--%>

<%@ page contentType="text/html; charset=UTF-8"
         import="com.frontleaf.content.Folder,
                 com.frontleaf.security.User,
                 com.frontleaf.server.DispatcherTools" %>

<%@ taglib uri="http://www.frontleaf.com/tlds/request-tags-1.0" prefix="rc" %>

<rc:request> 
  <parameter name="folderID" type="folder"/>
  <parameter name="exclude" type="string" default=""/>
</rc:request>

<%
  DispatcherTools.disableCache(response);
  final User user = (User) request.getUserPrincipal();
  final Folder folder = (Folder) requestData.getObject("folderID");
%>

<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html>
<head>
  <title>Upload HTML Document</title>
</head>
<body>

<form id="UploadForm" 
      method="POST"
      name="UploadForm" 
      enctype="multipart/form-data" 
      action="/system/components/convio/tiny_mce/plugins/cms_upload/upload-finish.jsp">

<table id="bodyContainer">
<thead id="fileHeader">
  <tr>
    <th><span class="sectionHead">Upload HTML Document</span></th>
  </tr>
</thead>
<tbody id="fileBody">
  <tr class="element">
    <td id="errors-file" class="error" style="white-space:normal;width:400px"></td>
  </tr>
  <tr class="element">
    <td>
      Please choose an HTML document to upload:<br/>
      <input type="file" name="file" size="30" style="width:400px;" />
    </td>
  </tr>
</tbody>
<thead id="imageHead" style="display:none">
  <tr>
    <td><span class="sectionHead">Images</span></td>
  </tr>
  <tr class="element">
    <th>
      The following local images are related to this document.  <br/>
      Please upload the ones you want to retain in this page.
    </th>
  </tr>
</thead>
<tbody id="imageBody" style="display:none">
  <tr>
    <td>
      <input type="hidden" id="folderID" name="folderID" value="<%=folder.getID()%>" />
      <input type="hidden" id="imageCount" name="imageCount" value="0" />
      <input type="hidden" id="fileLocation" name="fileLocation" value="" />
      <div style="position:relative;margin-top:8px">
      <table id="imageTable"><tbody></tbody></table>
      </div>
    </td>
  </tr>
</tbody>
</table>

</form>

</body>
</html>
