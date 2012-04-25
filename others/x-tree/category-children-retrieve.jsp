<%--
 $Source: /home/cvs/cvsroot/cms/integration/web/components/x-tree/category-children-retrieve.jsp,v $
 $Author: mpih $
 $Revision: 1.1 $
 $Date: 2011/01/07 13:16:04 $

  Outputs the category children via JSON.
--%>

<%@ page contentType="text/javascript; charset=UTF-8"
         import="com.frontleaf.category.Category,
                 com.frontleaf.category.CategoryIterator,
                 com.frontleaf.security.User,
                 com.frontleaf.util.JSONTools,
                 org.json.JSONArray,
                 org.json.JSONObject" %>

<%@ taglib uri="http://www.frontleaf.com/tlds/request-tags-1.0" prefix="rc" %>

<rc:request>
  <parameter name="categoryID" type="category" />
</rc:request>

<%
  User user = (User) request.getUserPrincipal();
  if (user == null || user.isAnonymous()) {
    response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
    return;
  }

  Category category = (Category) requestData.getObject("categoryID");
  if (! category.getHost().isAdmin(user)) {
    response.sendError(HttpServletResponse.SC_FORBIDDEN);
    return;
  }

  String breadcrumb = category.getNavigationTrail(category.getRoot());

  JSONObject child = null;
  JSONArray children = new JSONArray();

  for (CategoryIterator i = category.getChildren(); i.hasNext();) {
    Category c = i.next();

    child = new JSONObject();
    child.put("label", c.getLabel());

    boolean hasChildren = c.hasChildren();
    child.put("isLeaf", ! hasChildren);
    child.put("id", c.getID());
    child.put("icon", "/system/icons/16x16/box.gif");
    child.put("path", c.getPath());
    child.put("breadcrumb", breadcrumb + " > " + c.getLabel());
    children.put(child);
  }


  JSONObject parent = new JSONObject();
  parent.put("label", category.getLabel());
  parent.put("isLeaf", children.length() == 0);
  parent.put("id", category.getID());
  parent.put("icon", "/system/icons/16x16/box.gif");
  parent.put("path", category.getPath());
  parent.put("breadcrumb", breadcrumb);
  parent.put("children", children);

  JSONTools.write(response, parent);
%>