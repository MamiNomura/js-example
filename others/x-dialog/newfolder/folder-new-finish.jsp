<%@ page contentType="text/javascript; charset=UTF-8"
         import="com.frontleaf.sql.*,
                 com.frontleaf.link.FolderNavigationLinkSet,
                 com.frontleaf.content.*,
                 com.frontleaf.content.template.Wrapper,
                 com.frontleaf.content.template.WrapperStore,
                 com.frontleaf.content.template.WrapperTools,
                 com.frontleaf.data.Record,
                 com.frontleaf.security.User,
                 com.frontleaf.server.URLAlias,
                 com.frontleaf.util.Assert,
                 java.util.List,
                 org.json.JSONObject"%>

<%@ taglib uri="http://www.frontleaf.com/tlds/request-tags-1.0" prefix="rc" %>

<rc:request>
  <parameter name="folderID" type="integer"/>
  <parameter name="parentID" type="folder"/>
  <parameter name="title" type="string"/>
  <parameter name="systemName" type="string"/>
  <parameter name="wrapperName" type="string" required="false"/>
  <parameter name="createIndex" type="boolean" default="false"/>
</rc:request>

<%!
  private String checkData(Folder parent, String name, String title) {
    
    if (parent.hasChildName(name)) {

      return "duplicatename";
    } 

    if (URLAlias.find(parent, name) != null) {

      return "duplicatealias";
    }

    if (parent.equals(parent.getHost().getRootFolder()) && 
	parent.getHost().isReservedName(name)) {

      return "reservedname";
    } 

    Query query = StatementCatalog.getQuery("Folder", "titleExists");
    query.setID("parentID", parent);
    query.setString("title", title);

    if (query.getBoolean()) {
      return "duplicatetitle";
    }

    return "OK";
  }
%>
<% 
  String result = "OK";
  String detail = "";
  
  Folder parent = (Folder) requestData.getObject("parentID");

  User user = (User) request.getUserPrincipal();

  if (user.isAnonymous()) {

    result = "nouser";

  } else if (! parent.checkPermission(user, "author")) {

    result = "noauth";

  } else {

    String name = requestData.getString("systemName");
    String title = requestData.getString("title");
    result = checkData(parent, name, title);

    if (result.equals("OK")) {

      Folder folder = new Folder(parent);
      folder.setTitle(title);
      folder.setName(name);
      folder.create(requestData.getInteger("folderID"));

      // Create a new navigation link set for new subsites
      if (folder.equals(folder.getSubsite())) {
	    FolderNavigationLinkSet navMenu = 
          FolderNavigationLinkSet.newInstance(folder);
	    navMenu.setModifyingUser(user);
	    navMenu.save();
      }  
%>

<%@include file="folder-new-custom-finish.jspi"%>

<%
      SessionManager.closeConnection();

      // Assign a wrapper to this folder.
      if (!WrapperTools.hideWrappers()) {
        String wrapperName = requestData.getString("wrapperName");

        Integer wrapperID = null;
        if (wrapperName != null) {
          Wrapper wrapper = WrapperStore.getInstance().getWrapper(wrapperName, folder.getSubsite());
          if (wrapper != null) {
            wrapperID = wrapper.getID();
          }
        }

        Wrapper.assignFolderWrapper(folder.getID(), wrapperID);
      }

      // Inherit folder reviewers from the parent folder.
      List<User> reviewers = DocumentReviewer.getReviewers(parent);
      DocumentReviewer.setReviewers(folder, reviewers);

      if (requestData.getBoolean("createIndex")) {

        ExtendedType type = 
          ExtendedType.getDefault(Type.find("page"), folder.getRoot());

        HTMLDocument folderIndexPage = new HTMLDocument(folder, type);
        folderIndexPage.setTitle(folder.getTitle() + " Index Page");
        folderIndexPage.setModifyingUser(user);
        folderIndexPage.setName("index.html");
        folderIndexPage.save();

        folder.setIndexPageID(folderIndexPage.getID());
        folder.save();
      }
      
      JSONObject json = new JSONObject();
      json.put("id", folder.getID());
      json.put("parentID", parent.getID());
      
      response.resetBuffer();
      out.write(json.toString());
    } else {
      JSONObject json = new JSONObject();
      json.put("error", result);
      json.put("systemName", name);
      json.put("title", title);
      
      response.resetBuffer();
      out.write(json.toString());
    }
  }
%>
