<template>
<draggable @start="startSort" @end="saveSort" :element="'ul'" :options="{group:'same'}"
      :list="fields">
			<li v-for="field in fields" :key="field.field" @click="log">
         <p>{{field.field}}</p>
         <settings-field-list v-if="field.children"
          :fields="field.children"/>
			  </li>
</draggable>
</template>

<script>
export default {
  name: "settings-field-list",
  props: {
    fields: {
      type: Array,
      required: true
    }
  },
  computed: {
    hasChildren() {
      if (this.fields.children) {
        var num = Object.keys(this.fields.children).length;
        console.log("has children");
        return (num > 0 && num != null && num != undefined);
      }
      console.log("childless")
      return false;
    },
    sortableOptions(){
      return {
        group: { name: "test"
        },
        store: this.store,
        };
    },
    store(){ //SortableJS in VueDraggable
      return {
		/**
		 * Get the order of elements. Called once during initialization.
		 * @param   {Sortable}  sortable
		 * @returns {Array}
		 */
		get: function (sortable) {
			var order = localStorage.getItem(sortable.options.group.name);
			return order ? order.split('|') : [];
		},

		/**
		 * Save the order of elements. Called onEnd (when the item is dropped).
		 * @param {Sortable}  sortable
		 */
		set: function (sortable) {
			var order = sortable.toArray();
			localStorage.setItem(sortable.options.group.name, order.join('|'));
		    }
      }
    },
   fieldTree(){
      const fieldsArray = Object.values(this.fields);

      var [filtered, nonGroupFields] = this.$lodash.partition(fieldsArray,
         field => field.type.toLowerCase() === "group")

      var groupFields = filtered.map(group => ({
          ...group,
          children: []
        }));
      
    var groupedGroups = []

      nonGroupFields.forEach(field => {
        if (field.group != null) {
          const groupIndex = this.$lodash.findIndex(
            groupFields,
            group => group.id === field.group
          );
          return groupFields[groupIndex].children.push(field);
        }
          return groupedGroups.push(field);
      })

      groupFields.forEach((child, index) => {
        const groupIndex = this.$lodash.findIndex(
            groupFields,
            group2 => group2.id === child.group
          );
        if (groupIndex > -1) {
          groupFields[groupIndex].children.push(child);
        } else {
          groupedGroups.push(child);
        }
      });

        return groupedGroups;
    },
  },
  watch: {
    fields: {
      deep: true,      
      handler(val) {
        console.log("watcher: field changed")
        this.fieldArranged = [...this.fieldTree];
        // if (val.children > 0) {
        //   console.log("children: ")
        //   console.log(val.children)
        // } else {
        //   this.children = null;
        // }
      }
    }
  },
  methods:{
 
    expand(){
      alert("alert");
    },
    startSort(){
      this.$emit('startSort');
    },
    saveSort(){
      this.$emit('saveSort');
    },
    startEditingField(field){
      this.$emit('start-editing-field', field);
    },
    duplicateField(field){
      this.$emit('duplicate-field', field);
    },
    warnRemoveField(fieldName){
      this.$emit('warn-remove-field', fieldName);
    },
    canDuplicate(fieldInterface) {
      return (
        this.duplicateInterfaceBlacklist.includes(fieldInterface) === false
      );
    },
    log(){
      console.log(this.fieldArranged);
    }
  },
  data(){
    return {
      duplicateInterfaceBlacklist: [
        "primary-key",
        "many-to-many",
        "one-to-many",
        "many-to-one",
        "sort"
      ],
      children: null,
      loaded: false,
      fieldArranged: null
    }
  }
}
</script>

<style lang="scss" scoped>
.group{
  background-color:pink;
}
.dragging .row:hover {
      background-color: var(--white);
  }

  .row {
      cursor: pointer;
      position: relative;
      height: 40px;
      border-bottom: 1px solid var(--lightest-gray);

      &:last-of-type {
        border-bottom: none;
      }

      &:hover {
        background-color: var(--highlight);
      }

      .required {
        color: var(--accent);
        vertical-align: super;
        font-size: 7px;
      }

      .key {
        color: var(--light-gray);
        font-size: 16px;
        vertical-align: -3px;
        margin-left: 2px;
      }
    }

.drag {
      user-select: none;
      cursor: -webkit-grab;
      color: var(--lighter-gray);

      &:hover {
        color: var(--dark-gray);
      }
}

  i {
    color: var(--light-gray);
    margin-right: 5px;
    transition: color var(--fast) var(--transition);
  }

  button {
    display: flex;
    align-items: center;
    padding: 5px;
    color: var(--darker-gray);
    width: 100%;
    height: 100%;
    transition: color var(--fast) var(--transition);
    &:disabled,
    &[disabled] {
      color: var(--lighter-gray);
      i {
        color: var(--lighter-gray);
      }
    }
    &:not(:disabled):not(&[disabled]):hover {
      color: var(--accent);
      transition: none;
      i {
        color: var(--accent);
        transition: none;
      }
}
  
.more-options {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);

  i {
    color: var(--lighter-gray);
    transition: color var(--fast) var(--transition);
  }

  &:hover {
    i {
      transition: none;
      color: var(--gray);
    }
  }
}

}

  li{
  border: 1px solid black;
    -webkit-touch-callout: none; /* iOS Safari */
    -webkit-user-select: none; /* Safari */
     -khtml-user-select: none; /* Konqueror HTML */
       -moz-user-select: none; /* Firefox */
        -ms-user-select: none; /* Internet Explorer/Edge */
            user-select: none;
    padding:10px;
  }

  ul{
    padding:30px;
  }
</style>