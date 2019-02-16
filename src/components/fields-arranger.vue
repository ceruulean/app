<template>
<div>
  <v-checkbox
    id="showGuidesCol"
    :checked="showGuidesCol"
    label="Show column guides"
    @change="showGuidesCol = !showGuidesCol"
    value="showGuidesCol"
  />
  <v-checkbox
    id="showGuidesBound"
    :checked="showGuidesBound"
    label="Show boundary guides"
    @change="showGuidesBound = !showGuidesBound"
    value="showGuidesBound"
  />
  <v-checkbox
    id="RTL"
    :checked="RTL"
    label="Right to Left (need dir='rtl' in html tag)"
    @change="RTL = !RTL"
    value="RTL"
  />

  <v-checkbox v-if="mode == 'group'"
    id="modeGroup"
    :label="mode"
    value="modeGroup"
    @change="mode = 'sort'"
  />

  <v-checkbox v-if="mode == 'sort'"
    id="modeSort"
    :label="mode"
    value="modeSort"
    @change="mode = 'group'"
  />

<!-- <div :class="{
  'grid' : true,
  'guideColumn' : showGuidesCol,
  'RTL' : RTL,
  }"
  @click="log"
  > -->

<draggable v-model="sortOrder"
 :class="{
  'grid' : true,
  'guideColumn' : showGuidesCol,
  'RTL' : RTL,
  }"
  @click="log"
  @start="startSort"
  @end="saveSort"
  >
<div v-for="field in sortOrder" :key="field.id"
  :ref="ref(field.id)"
  :class="{'hidden' : (field.hidden_detail == 'true' || field.hidden_detail == 1)}"
  >
<div :class="{ 'v-field' : true, 'guideBound': showGuidesBound }"
   draggable
   :style="width(field)"
   @drag="fieldDrag(field)"
   @dragover="fieldDragOver"
   @dragenter="fieldDragEnter"
   >

    <component :is="fieldset(field.interface) ? 'fieldset' : 'p'">

        <div class="heading">
          <template v-if="!hideLabel(field.interface)">
            <div class="label">
              <component :is="fieldset(field.interface) ? 'legend' : 'label'" :for="field.field">
                {{ field.name || $helpers.formatTitle(field.field)
                }}<i
                  v-tooltip="$t('required')"
                  class="material-icons"
                  v-if="field.required === true || field.required === '1'"
                  >star</i
                >
              </component>
      <!--
              <label v-if="false" class="batch-label">
                <v-toggle
                  :value="!blocked"
                  @input="
                    $emit(blocked ? 'activate' : 'deactivate', field.field)
                  "
                />
              </label>
      -->
            </div>
          </template>
          <small
            v-if="field.note"
            v-html="$helpers.snarkdown(field.note)"
          />
        </div>
        
  <div class="interface">

      <v-ext-input
        readonly
        :id="field.interface"
        :name="field.name"
        :type="field.type"
        :datatype="field.datatype"
        :length="field.length"
        :required="field.required"
        :options="field.options"
        :relation="dummyRelation(field)"
        :fields="fields"
        :value="null"

        :class="{
          'small' : (optionWidth(field) === 'small'),
          'medium' : (optionWidth(field) === 'medium'),
          'large' : (optionWidth(field) === 'large'),
          'auto' : (optionWidth(field) === 'auto'),
        }"
      />
<span v-if="dummyStatus(field)" class="dummy-status">
    <v-radio
      v-for="(radio, key) in dummyRadios"
      :id="'dummy'+key"
      :name="radio.name"
      :value="key"
      :key="key"
      disabled
      :model-value="String(value)"
      :label="$t(radio.name)"
      :checked="false"
    ></v-radio>
</span>
  </div>
   </component>

      <div class="drag-handle right"
        draggable
        @dragstart="dragStart($event, ref(field.id), true)"
        @drag="drag($event, true)"
        @dragend="dragEnd($event, field.field, ref(field.id), true)">
      </div>

      <div class="drag-handle left"
        draggable
        @dragstart="dragStart($event, ref(field.id), false)"
        @drag="drag($event, false)"
        @dragend="dragEnd($event, field.field, ref(field.id), false)">
      </div>

</div>


</div>
</draggable>
 <!--</div> grid -->
</div>
</template>

<script>
import VField from "./form/field.vue"

export default {
  name: "v-fields-arranger",
  components:{
    VField
  },
  metaInfo() {
    return {
      title: "Arrange"
    }
  },
  props: {
    fields: Array
  },
  watch: {
    fields(n) {
      if (n != null) {this.sortInit(this.fields);}
    }
  },
  data() {
    return {
      isDraggingWidth: false,
      mousedown: false,
      initialX: null,
      initialY: null,
      xPos1:null,
      xPos2:null,
      yPos1:null,
      targetField:null,
      elementWidth: 0,
      waiter:false,

      widths: {},
      sortOrder: null,

      showGuidesCol: true,
      showGuidesBound: true,

      RTL: false,

      dummyRadios: null,

      mode: "sort", // other option is "group" for creating groups
    }
  },
  computed: {

  },
  methods: {
    changeMode(){
      if (this.mode == "sort") {
        this.mode = "group";
      } else{
         this.mode = "sort";
      }
    },
    drag(e, R){
        this.xPos2 = (e.screenX);

          if (this.xPos2 != 0) {
          var delta = (this.xPos2 - this.xPos1) * (R ? 1 : -1); // Left side delta is opposite of right
          var wtf = this.elementWidth + delta;

         // console.log(e.target.parentElement);

          e.target.parentElement.style="width:"+ wtf +"px;max-width:(--width-x-large);"
          this.elementWidth = e.target.parentElement.clientWidth;
          this.xPos1 = this.xPos2;
       }
    },
    dragStart(e, parentReference, R){
      this.isDraggingWidth = true;
      e.dataTransfer.setData('Text', 'node'); // Firefox...
      e.dataTransfer.effectAllowed = "move";

        e.target.parentElement.dataset.focus = "true";
        this.elementWidth = e.target.parentElement.clientWidth;
        this.initialX = this.xPos1 = (e.clientX || e.screenX);
        this.initialY = this.xPos2 = (e.clientY || e.screenY);

      if (!R) {// left handlebar
        this.$refs[parentReference][0].style = "margin-left: auto;";
      } else if (R && this.RTL) {
        this.$refs[parentReference][0].style = "margin-right: auto;"
      }
    },
    dragEnd(e, fieldName, parentReference, R) {
        this.xPos2 = (e.clientX || e.screenX);
        var delta = (this.xPos2 - this.xPos1) * (R ? 1 : -1);
        
        if (!R || this.RTL) { // left side handlebar
         this.$refs[parentReference][0].style = null;
        }

        var final = e.target.parentElement.clientWidth + delta;
        e.target.parentElement.style="width:var(--width-"+ this.pixelToWidth(final) +");max-width:(--width-x-large);"
        e.target.parentElement.dataset.focus = "false";

      this.widths[fieldName] =  final;
      this.isDraggingWidth = false;
      console.log('end');
    },
    fieldDrag(field){
      console.log(field.sort);
    },
    fieldDragOver(){
      console.log('d')
    },
    fieldDragEnter(){
      //todo
    },
    flexOrder(fieldName){
      var s = this.$lodash.findKey(this.sortOrder, {"field" : fieldName});
      console.log(s);
     return "order:"+s+";";
    },
    log() {
   // console.log(this.fields);
    console.log(this.sortOrder);
    console.log(this.sortListPublic);
    },
    startSort() {
      //todo
    },
    saveSort() {
      this.sortOrder.forEach((item, index) => {
        item.sort = index
      });
    },
    width(field) {
        var w = "";

        if (this.widths[field.field]) {
          w = this.pixelToWidth(parseInt(this.widths[field.field]));
          return "width:var(--width-"+ w +");max-width:var(--width-"+ w +");"; 

        } else {

          switch (field.width) {
            case 1:
            default:
              w = "small"
              break;
            case 2:
              w = "medium"
              break;
            case 3:
              w = "large"
              break;
            case 4:
              w = "x-large"
              break;
          }

          return "width:var(--width-"+ w +");max-width:var(--width-"+ w +");"; 

        }
},
    pixelToWidth(pix) {
      var w = 0;
      const variance = 50; // +- variance
      if (pix <= (140 + variance)) {
         return "small";
      } else if (pix <= (300 + variance)) {
        return "medium";
      } else if (pix <= (460 + variance)) {
        return "large";
      } else {
        return "x-large";
      }
    },
    fieldset(interfaceName) {
      const interfaceInfo = this.$store.state.extensions.interfaces[
        interfaceName
      ];

      return (interfaceInfo && interfaceInfo.fieldset) || false;
    },
    hideLabel(fieldName) {
      const interfaceName = fieldName;
      const interfaceMeta = this.$store.state.extensions.interfaces[
        interfaceName
      ];

      if (!interfaceMeta) return false;

      if (interfaceMeta && interfaceMeta.hideLabel)
        return interfaceMeta.hideLabel;

      return false;
    },
    optionWidth(field) {
      if (field.options == null) {return false};
      if (Object.keys(field.options).length > 0) {
        if (field.options.width) {
          return field.options.width;
        }
      } else {
        return false;
      }
    },
    dummyRelation(field) {
        switch (field.type.toLowerCase()) {
          case "m2m":
          case "o2m":
          case "translation":
            return {"filler":"error"};
            break;
          default:
            return null;
            break;
        }
    },
    dummyStatus(field) {
      if (field.type == "status") {
        this.dummyRadios = field.options.status_mapping;
        return true;
      }
      return false;
    },
    sortInit(){
      // this.fields.filter(e => e.interface != 'primary-key').forEach(field => {
      //     this.sortOrder[field.sort] = field;
      // });
      this.sortOrder = [];
      this.fields.forEach(field => {
          this.sortOrder.push(field);
       });

   // console.log(this.sortOrder);
    },
    ref(id){
      return "field-"+id;
    }
  }
};
</script>

<style lang="scss" scoped>
.grid {
  position:relative;
  display:flex;
  flex-flow:row wrap;

  border: 5px var(--lighter-gray) dashed;
  border-collapse:collapse;
  padding:10px 0;
  max-width:calc(var(--width-x-large) + 30px);

  color: var(--light-gray);

  &.guideColumn {
    background-size:161px 170px;
    background-image:
      linear-gradient(to right, transparent,
      transparent 159px,
      var(--lightest-gray) 159px,
      var(--lightest-gray));
  }
}

.col {
  border: 5px var(--lighter-gray) dashed;
  width: var(--width-small);
  flex-basis: var(--width-small);
  height:100%;
  margin-right:20px;
}

.drag-handle {
  width: 10px;
  height: 100%;
  cursor: col-resize;
  position: absolute;

  bottom:0;
  opacity: 0;

  &.right {
   right:-3px;
  }

  &.left{
    left:-3px;
  }
}

.dummy-status {

  & > div{
  display: inline-block;
  margin-right: 40px;
  margin-bottom: 20px;
  }
}

i {
    color: var(--accent);
    vertical-align: super;
    font-size: 7px;
  }

fieldset,
p {
  border: 0;
  padding: 0;
}

fieldset > div,
p {
  display: flex;
  flex-direction: column;
}

.v-field {
  position:relative;
  cursor:grab !important;
  margin:0 8px 50px 8px;
  border:2px transparent solid;
  box-sizing:content-box;
  opacity:0.6;
  transition: opacity var(--fast) var(--transition-out);

  &:hover, &:focus, &:active {
  opacity:1;

  }

  &[data-focus="true"] {
    opacity:1;
    border:2px var(--accent) dashed;
    border-collapse:separate;
  }
}

.guideBound{
  border-color: var(--lighter-gray);
  border-style: dashed;
}

.hidden{
  visibility:hidden;
  display:none;
}

.interface {
  position:relative;
  max-width: 100%;

  & button {
  margin-left:0 !important;
  }
}

.v-input {
  /*
    -khtml-user-select: none;
    -webkit-user-select: none;
    -moz-user-select: -moz-none;
    -ms-user-select: none;
    -o-user-select: none;
    user-select: none;
    outline: none; */

  &.small {
    max-width:var(--width-small) !important;
  }
  &.medium {
    max-width:var(--width-medium) !important;
  }
  &.large {
    max-width:var(--width-large) !important;
  }
  &.auto {
    max-width:initial !important;
  }

}


small {
  order: 2;
  display: block;
  margin-top: 4px;
  font-style: italic;
  font-size: 12px;
  line-height: 1.5em;
  text-overflow: ellipsis;
}

.wrapper {

}
</style>