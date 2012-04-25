<%--
 $Source: /home/cvs/cvsroot/cms/integration/web/components/x-tree/children-retrieve.jsp,v $
 $Author: mpih $
 $Revision: 1.6 $
 $Date: 2011/05/12 17:54:53 $

  Outputs the folder children via JSON.
--%>

<%@ page contentType="text/javascript; charset=UTF-8"
         import="com.frontleaf.content.Folder,
                 com.frontleaf.security.User,
                 com.frontleaf.server.DispatcherTools,
                 com.frontleaf.server.FileIconManager,
                 com.frontleaf.sql.MapDataSource,
                 com.frontleaf.sql.Query,
                 com.frontleaf.sql.StatementCatalog,
                 com.frontleaf.sql.TableDataSource,
                 com.frontleaf.util.JSONTools,
                 java.util.Iterator,
                 org.json.JSONArray,
                 org.json.JSONObject" %>

<%@ taglib uri="http://www.frontleaf.com/tlds/request-tags-1.0" prefix="rc" %>

<rc:request>
  <parameter name="folderID" type="folder" />
  <parameter name="requiredPerm" type="string" default="read" />
  <parameter name="showDocuments" type="boolean" default="false" />
  <parameter name="showImages" type="boolean" default="false" />
</rc:request>

<%! 
  private FileIconManager iconManager = FileIconManager.getInstance();
%>

<%
  DispatcherTools.disableCache(response);

  User user = (User) request.getUserPrincipal();
  if (user == null || user.isAnonymous()) {
    response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
    return;
  }

  Folder folder = (Folder) requestData.getObject("folderID");
  String requiredPerm = requestData.getString("requiredPerm");

  boolean showDocuments = requestData.getBoolean("showDocuments");
  boolean showImages = requestData.getBoolean("showImages");

  if (! folder.getHost().isAdmin(user)) {
    response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
    return;
  }

  boolean parentHasPermission = folder.checkPermission(user, requiredPerm);

  String breadcrumb = folder.getNavigationTrail();

  // TODO: only run this query for documents. Also run a version of this query for show/no images.
  Query query = StatementCatalog.getQuery("fusion/content/DocumentTree", "documentContents");
  query.setID("folderID", folder);
  MapDataSource hasDocumentsData = query.getMapDataSource("folderID");

  JSONObject child = null;
  JSONArray children = new JSONArray();

  // Always include folders.
  for (Iterator<Folder> i = folder.getChildren(); i.hasNext();) {
    Folder f = i.next();

    // Only include folders to which the user has access.
    if (user != null) {
      boolean hasPermission = f.checkPermission(user, requiredPerm);

      boolean hasChildren = f.hasChildren();
      if (showDocuments) {
        boolean hasDocuments = false;
        if (hasDocumentsData.containsRow(f.getID())) {
          hasDocumentsData.setRow(f.getID());
          hasDocuments = hasDocumentsData.getBoolean("hasDocuments");
        }
        hasChildren = hasChildren || hasDocuments;
      }

      child = new JSONObject();
      child.put("label", f.getTitle());
      child.put("isLeaf", ! hasChildren);
      child.put("id", f.getID());
      child.put("contentType", "folder");
      child.put("canAccess", hasPermission);
      child.put("icon", hasPermission ? iconManager.getFileIcon(f) : "/system/icons/16x16/folder_forbidden.gif");
      child.put("path", f.getPath());
      child.put("breadcrumb", breadcrumb + " > " + f.getTitle());
      children.put(child);
    }
  }

  String folderPath = folder.getPath();

  // Optionally include items, assuming the user has permission.
  if (showDocuments && parentHasPermission) {
    String queryName = (showImages ? "documentTree" : "documentTreeNoImages");
    query = StatementCatalog.getQuery("fusion/content/DocumentTree", queryName);
    query.setID("folderID", folder);
    TableDataSource data = query.getTableDataSource();
    while (data.next()) {

      String contentType = data.getString("contentType");
      if (! showImages && "image".equals(contentType)) {
        // Skip images.
        continue;
      }

      child = new JSONObject();
      child.put("label", data.getString("title"));
      child.put("isLeaf", true);
      child.put("id", data.getInteger("itemID"));
      child.put("contentType", contentType);

      String itemPath = folderPath + data.getString("systemName");
      child.put("canAccess", true);
      child.put("icon", iconManager.getFileIcon(itemPath));
      child.put("path", itemPath);
      child.put("breadcrumb", breadcrumb + " > " + data.getString("title"));
      children.put(child);
    }
  }

  JSONObject parent = new JSONObject();
  parent.put("label", folder.getTitle());
  parent.put("isLeaf", children.length() == 0);
  parent.put("id", folder.getID());
  parent.put("contentType", "folder");
  parent.put("canAccess", parentHasPermission);
  parent.put("icon", parentHasPermission ? iconManager.getFileIcon(folder) : "/system/icons/16x16/folder_forbidden.gif");
  parent.put("path", folderPath);
  parent.put("breadcrumb", breadcrumb);
  parent.put("children", children);

  JSONTools.write(response, parent);
%>