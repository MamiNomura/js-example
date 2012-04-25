

<%@ page contentType="text/html; charset=UTF-8"
         import="com.frontleaf.content.Folder,
                 com.frontleaf.content.FolderPathIterator,
                 com.frontleaf.security.User,
                 com.frontleaf.server.DispatcherTools,
                 com.frontleaf.server.Host,
                 com.frontleaf.util.StringTools" %>

<%@ taglib uri="http://www.frontleaf.com/tlds/request-tags-1.0" prefix="rc" %>
<%@ taglib uri="http://www.frontleaf.com/tlds/ui-tags-1.0" prefix="ui" %>

<rc:request>
  <parameter name="hostID" type="integer"/>
  <parameter name="folderID" type="integer" required="false"/>
  <parameter name="requiredPerm" type="string" default="read" />
</rc:request>

<%
  DispatcherTools.disableCache(response);

  User user = (User) request.getUserPrincipal();
  if (user == null || user.isAnonymous()) {
    response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
    return;
  }

  Integer hostID = requestData.getInteger("hostID");
  Host host = Host.find(hostID);

  if (! host.isAdmin(user)) {
    response.sendError(HttpServletResponse.SC_FORBIDDEN);
    return;
  }

  String requiredPerm = StringTools.escapeQuotes(requestData.getString("requiredPerm"));

  Integer folderID = requestData.getInteger("folderID");
  Folder folder = null;
  if (folderID != null) {
    folder = Folder.find(folderID);
  }
%>

<ui:dialog>
<ui:title>Choose A Folder</ui:title>
<ui:init>
  var args = YAHOO.convio.dialog.getArgs();
  var gSubsiteID = <%=host.getRootFolder().getID()%>;
  var gFolderID = <%=(folder != null) ? folder.getID() : null%>;
  var gRequiredPerm = '<%=requiredPerm%>';

  // Add the user prompt.
  if (args.prompt) {
    YAHOO.util.Dom.get("userPrompt").innerHTML = args.prompt;
  }


  var gExpandIDs = [];
<%
  // If a default folder is passed in, generate a JS stack of
  // folderIDs representing the 
  if (folder != null && ! folder.equals(host.getRootFolder())) { 
    FolderPathIterator i = folder.getPathIterator(); 
    while (i.hasNext()) { 
      Folder next = i.nextFolder(); 
      if (next.equals(host.getRootFolder())) {
        continue;
      }
%>
  gExpandIDs.push(<%=next.getID()%>);
<%
    }  // end: while (i.hasNext())
  }
%>

  // Initialize the document tree.
  var gFolderTree = new YAHOO.convio.tree.DocumentTree({
      id: "folderTree", 
      subsiteID: gSubsiteID,
      folderID: gFolderID,
      expandIDs: gExpandIDs,
      showDocuments: false,
      requiredPerm: gRequiredPerm
    });
  gFolderTree.onChange = function() {
    var selectedNode = gFolderTree.getSelectedNode();
    args.folder = selectedNode ? selectedNode.data : null;
  };

</ui:init>
<ui:validate>
  var gRequiredPerm = '<%=requiredPerm%>';

  var args = YAHOO.convio.dialog.getArgs();

  var gFolderTree = YAHOO.convio.tree.get("folderTree");
  var selectedNode = gFolderTree.getSelectedNode();
  if (! selectedNode) {
    YAHOO.convio.dialog.addError("selectedFolder", "Please select a folder.");
  } else {

    //console.debug("++++ selectedNode=", selectedNode);

    var hasAuthorPermission = false;
    if (! selectedNode.data.canAccess) {
      YAHOO.convio.dialog.addError("selectedFolder", "Please select another folder.");
    } else if (args.validate) {
      args.validate(args.folder);
    }
  }
</ui:validate>
<ui:body>

<ui:error id="selectedFolder" />

<span id="userPrompt"></span>

<div id="folderTree" class="folderTree"></div>

</ui:body>
</ui:dialog>