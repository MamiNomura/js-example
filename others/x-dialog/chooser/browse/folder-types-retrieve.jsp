<%--
 $Source: /home/cvs/cvsroot/cms/integration/web/components/x-dialog/chooser/browse/folder-types-retrieve.jsp,v $
 $Author: mpih $
 $Revision: 1.2 $
 $Date: 2009/10/26 23:23:05 $

 Generate a list of content types mapped to the folder, optionally filtered
 by base content type and extended content type.
--%>

<%@ page contentType="text/javascript; charset=UTF-8"
         import="com.frontleaf.content.Folder,
                 com.frontleaf.security.User,
                 com.frontleaf.sql.Query,
                 com.frontleaf.sql.StatementCatalog,
                 com.frontleaf.sql.TableDataSource,
                 com.frontleaf.util.JSONTools,
                 com.frontleaf.util.StringTools,
                 org.json.JSONArray,
                 org.json.JSONObject" %>

<%@ taglib uri="http://www.frontleaf.com/tlds/request-tags-1.0" prefix="rc" %>

<rc:request>
  <parameter name="folderID" type="folder"/>
  <parameter name="baseType" type="string" required="false"/>
  <parameter name="typeID" type="integer" required="false"/>
</rc:request>

<%
  User user = (User) request.getUserPrincipal();

  Folder folder = (Folder) requestData.getObject("folderID");
  String filterBaseType = requestData.getString("baseType");
  Integer filterTypeID = requestData.getInteger("typeID");

  JSONObject json = new JSONObject();

  if (! folder.checkPermission(user, "author")) {
    JSONTools.writeError(response, "permission_denied", "You do not have author permission on this folder. Please check with an administrator if you need help.");
    return;
  }

  String queryName = "idAndLabelByFolder";
  if (filterTypeID != null) {
    queryName = "idAndLabelByFolderAndExtendedType";
  } else if (! StringTools.isEmpty(filterBaseType)) {
    queryName = "idAndLabelByFolderAndBaseType";
  }

  Query query = StatementCatalog.getQuery("type/ExtendedType", queryName);
  query.setString("baseType", filterBaseType);
  query.setID("folderID", folder);
  query.setString("baseType", filterBaseType);
  query.setInteger("typeID", filterTypeID);
  TableDataSource types = query.getTableDataSource();

  if (! types.hasData()) { 
    // No types are assigned to this folder.

    if (filterTypeID != null) {
      JSONTools.writeError(response, "no_types", "The selected content type is not assigned to this folder.");
      return;

    } else if (! StringTools.isEmpty(filterBaseType)) {
      JSONTools.writeError(response, "no_types", "No matching types are assigned to this folder.");
      return;

    } else {
      JSONTools.writeError(response, "no_types", "No types are assigned to this folder.");
      return;
    }
  }

  JSONArray typesJSON = new JSONArray();
  while (types.next()) {
    JSONObject type = new JSONObject();
    type.put("id", types.getInteger("typeID"));
    type.put("label", types.getString("label"));
    type.put("icon", "/assets/icons/16x16/" + types.getString("baseName") + ".gif");
    typesJSON.put(type);
  }
  json.put("types", typesJSON);

  JSONTools.write(response, json);
  return;
%>