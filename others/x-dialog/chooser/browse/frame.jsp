<%@ page contentType="text/html; charset=UTF-8"
         import="com.frontleaf.content.*,
                 com.frontleaf.util.Configuration,
                 java.util.logging.Logger" %>

<%@ taglib uri="http://www.frontleaf.com/tlds/request-tags-1.0" prefix="rc" %>

<rc:request>
  <parameter name="subsiteID" type="integer" required="false" />
  <parameter name="folderID" type="integer" />
  <parameter name="view" type="string" values="gallery,list" default="list"/>
  <parameter name="baseType" type="string" default=""/>
  <parameter name="typeID" type="string" default=""/>
  <parameter name="context" type="string" values="dialog,explorer"/>
  <parameter name="selectionType" type="string" values="single,multiple"
             default="single" />
  <parameter name="filterID" type="integer" required="false" />           
</rc:request>

<%!
  private static final String CATALOG = "type/ExtendedType";

  private static final Logger log = Logger.getLogger("com.frontleaf.content");

  private static final Integer PAGE_SIZE = 
    Configuration.getInstance().getInteger(
      "com.frontleaf.admin.explorer.PageSize", 20);
%>

<%
  Integer folderID = requestData.getInteger("folderID");
  Integer subsiteID = requestData.getInteger("subsiteID");
  String view = requestData.getString("view");
  String baseType = requestData.getString("baseType");
  String typeID = requestData.getString("typeID");
  String selectionType = requestData.getString("selectionType");

  String context = requestData.getString("context");

  Integer pageSize = (Integer) session.getAttribute("admin.explorer.PageSize");
  if (pageSize == null) { 
    pageSize = PAGE_SIZE;
  }
  session.setAttribute("admin.explorer.PageSize", pageSize);
  Integer filterID = requestData.getInteger("filterID");
  
  User listUser = (User) request.getUserPrincipal();

  Folder listFolder = Folder.find(folderID);
  boolean isAuthor = listFolder.checkPermission(listUser, "author");
 
%>
<div id="toolbar">
  <div class="buttons" style="float:left;">
      <a id="browse_button_bt" class="image_text_button" href="javascript:void(0);" title="Browse">
        <span class="button_text">Browse</span>
       </a>
       <a id="search_button_bt" class="image_text_button" href="javascript:void(0);" title="Browse">
         <span class="button_text">Search</span>
       </a>
       <a id="recent_button_bt" class="image_text_button" href="javascript:void(0);" title="Browse">
         <span class="button_text">Recent</span>
       </a>
     </div>


    <div class="buttons_right" style="margin-left: 30px;">

      <% if (isAuthor) { %>
      <a id="add-file" href="javascript:void(0);" title="New Item"><img src="/system/icons/16x16/document_add.png" border="0" /></a>
      <a id="add-folder" href="javascript:void(0);" title="Add Folder"><img src="/system/icons/16x16/folder_add.png" border="0" /></a>
      <div id="add-file-menu">
        <div class="bd"></div>
      </div>
      <% } %>

      <table>
        <tr>
          <td id="pageItems">&nbsp;</td>
          <td id="pageLinks">&nbsp;</td>
          <td id="pageSize">
            Size:&nbsp;
            <select id="pageSizeSelector" onchange="YAHOO.convio.dialog.getArgs().browseTabClass.changeSizeOfResultsOfBrowseTab()">
              <option value="20">20</option>
              <option value="40">40</option>
              <option value="60">60</option>
              <option value="80">80</option>
              <option value="4000">All</option>
            </select>
          </td>
        </tr>
      </table>
    </div>

</div>

<div id="ItemChooserBrowseTabMainTreeDiv" class="treeview-cms">
  <%@ include file="tree.jspi"%>
</div>
<div id="ItemChooserBrowseTabListDiv">
  <%@ include file="list.jspi"%>
</div>
