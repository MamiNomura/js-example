<%@ page contentType="text/html; charset=UTF-8"
         import="com.frontleaf.content.Folder,
                 com.frontleaf.content.FolderPathIterator,
                 com.frontleaf.fusion.content.DocumentTree,
                 com.frontleaf.fusion.content.RootTreeNodeRenderer,
                 com.frontleaf.security.User" %>

<%@ taglib uri="http://www.frontleaf.com/tlds/request-tags-1.0" prefix="rc" %>

<rc:request>
  <parameter name="treeFolderID" type="folder" />
  <parameter name="treeSubsiteID" type="folder" required="false" />
  <parameter name="requiredPerm" type="string" default="read" />
  <parameter name="showDocuments" type="boolean" default="false" />
  <parameter name="showImages" type="boolean" default="true" />
  <parameter name="showTypes" type="boolean" default="false" />
  <parameter name="isFrame" type="boolean" default="false" />
</rc:request>

<%
  User user = (User) request.getUserPrincipal();

  Folder folder = (Folder) requestData.getObject("treeFolderID");
  Folder subsite = (Folder) requestData.getObject("treeSubsiteID");
  if (subsite == null) { subsite = folder.getSubsite(); }

  boolean isFrame = requestData.getBoolean("isFrame");
  boolean showDocuments = requestData.getBoolean("showDocuments");
  boolean showImages = requestData.getBoolean("showImages");
  boolean showTypes = requestData.getBoolean("showTypes");
%>

<script src="/system/widgets/tree/tree.js"></script>
<script src="/admin/components/tree/tree.js"></script>

<script>
  gShowDocuments = <%=showDocuments%>;
  gShowImages = <%=showImages%>;
  gShowTypes = <%=showTypes%>;

  var expandIDs = new Array();

<%
  if (! folder.equals(subsite)) { 
   FolderPathIterator i = folder.getPathIterator(); 
   while (i.hasNext()) { 
     Folder next = i.nextFolder(); 
     if (next.equals(subsite)) { break; } 
   } 
   while (i.hasNext()) { 
     Folder next = i.nextFolder(); 
     out.println("expandIDs.push('" + next.getID() + "')"); 
   } 
  }
  out.println("expandIDs.push('" + folder.getID() + "')"); 
%>
</script>

<%
  if (! showDocuments) {
    String requiredPerm = requestData.getString("requiredPerm");
    RootTreeNodeRenderer renderer = new RootTreeNodeRenderer(user, requiredPerm);
    renderer.setRoot(subsite);
%>

<div id="ItemChooserBrowseTabTreeDiv"></div>

<%
  } else {

    DocumentTree tree = 
      new DocumentTree("/system/widgets/tree/images", "/assets/icons/16x16", user);
    tree.setImageDisplay(showImages);
    tree.write(subsite, out);
  }
%>
