const siteURL = 'http://localhost/blogsite'; // Replace this with the URL of your WP site
const apiRoute = '/wp-json/wp/v2/posts'; 
const spinner = '<img class="spinner" width="70" src="./assets/images/ajax-loader.gif" />';
const body = $('body');
const fetchPost = $('#fetch-post');
const postContent = $('.post-content');
const form = $('#post-submit-form');

/* EVENT HANDLERS -------------------- */

// Handle character remaining counter
body.on('input', '.post-content', handleInput);

// Fetch posts
fetchPost.on('click', fetchPosts);

// Submit Post
form.on('submit', submitPost);

// Delete Post
body.on('click', '.delete-post', deletePost);
    
// Update Post
body.on('click', '.edit-save-post', updatePost);

// Cancel Edit
body.on('click', '.cancel-edit', cancelEdit);

/* FUNCTIONS -------------------- */

// Update character remaining text on input
function handleInput() {
    // Remaining characters allowed    
    let remaining = calculateCharsRemaining($(this));
    
    if (remaining < 0) {
        return false;
    }

    $(this).siblings('.content-counter').html(`${remaining} characters remaining`);
}

/******************************************
 * GET ALL POSTS
 ******************************************/
function fetchPosts() {
    const wrapper = $('.post-wrapper');
    
    // Clear posts list
    wrapper.empty();

    // Insert spinner
    wrapper.append(spinner);

    $.ajax({
        method: 'GET',
        url: siteURL + apiRoute,
    })
    .done(function(response) {
        if (!response.length) {
            const message = '<p>No posts found</p>';
            $('.post-wrapper').append(message);
        } else {
            posts = renderPost(response);
            $('.post-wrapper').append(posts);
        }
    })
    .fail(function(response) {
        // Log error message if ajax call fails
        console.log(response);
    })
    .always(function() {
        // Remove preloader/spinner
        $('.spinner').remove();
    });
}

/******************************************
 * SUBMIT POST
 ******************************************/
function submitPost(e) {
    e.preventDefault();

    const contentArea = $(this).find($('.post-content'));
    const contentAreat = $(this).find($('.post-title'));
    
    if (!contentArea.val()) {
        contentArea.addClass('input-alert');
        return;
    }
    
    // Remove success message
    $('.notification').remove();

    // Disable textarea when submitting
    contentArea.prop('disabled', true);
    
    // Disable publish button when submitting
    $('#publish-post').prop('disabled', true);

    let postData = {
        "title": contentAreat.val(),
        "content": postContent.val(),
        "status": "publish"
    };
    
    $.ajax({
        method: 'POST',
        data: postData,
        url: siteURL + apiRoute,
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', 'Basic ' + window.btoa('admin:admin')); // Replace 'admin:password' with your own credentials
        },
    })
    .done(function(response) {
        form.append('<div class="notification" uk-alert><p>Post successfully submitted</p></div>');

        // Fade out notification
        setTimeout(function() {
            $('.notification').fadeOut();
        }, 2000);

        fetchPosts();
        // Empty textarea
        postContent.val('');
    })
    .fail(function(response) {
        console.log(response);
    })
    .always(function() {
        // Re-enable textarea
        contentArea.prop('disabled', false);
        
        // Re-enable publish button
        $('#publish-post').prop('disabled', false);

        // Remove input alert
        contentArea.removeClass('input-alert');
        // $('.spinner').remove();
    });
}

/******************************************
 * DELETE POST
 ******************************************/
function deletePost() {
    const confirmation = confirm('Are you sure you want to delete this post?');

    if (confirmation) {
        const postID = $(this).data('id');

        $.ajax({
            method: 'DELETE',
            url: siteURL + apiRoute + '/' + postID,
            beforeSend: function(xhr) {
                xhr.setRequestHeader('Authorization', 'Basic ' + window.btoa('admin:admin')); // Replace 'admin:password' with your own credentials
            }
        })
        .done(function(response) {
            fetchPosts();
        })
        .fail(function(response) {
            console.log(response);
        });
    }
}

/******************************************
 * UPDATE POST
 ******************************************/
function updatePost() {
    if (!$(this).hasClass('edit-mode')) {
        // Edit mode
        $(this).text('Save');
        $(this).siblings('.cancel-edit').show();
        $(this).addClass('edit-mode');

        const content = $(this).parents('.user-controls').siblings('.user-content').find('p');
        
        convertToEditable(content);
    } else {
        // Save mode
        const newContentTextArea = $(this).parents('.user-controls').siblings('.user-content').find('textarea');
        const postData = {
            "title": newContentTextArea.val(),
            "content": newContentTextArea.val(),
        };

        const postID = $(this).data('id');

        // Cache the edit button
        const that = $(this);
        
        if (!newContentTextArea.val()) {
            newContentTextArea.addClass('input-alert');
            return;
        }

        // Disable textarea
        newContentTextArea.prop('disabled', true);

        $.ajax({
            method: 'PUT',
            data: postData,
            url: siteURL + apiRoute + '/' + $(this).data('id'),    
            beforeSend: function(xhr) {
                xhr.setRequestHeader('Authorization', 'Basic ' + window.btoa('admin:admin')); // Replace 'admin:password' with your own credentials
            }
        })
        .done(function(response) {    
            // Refresh feed 
            fetchPosts();
        })
        .fail(function(response) {
            console.log(response);
        });
    } 
}

// Cancel the editing of post. This converts the editable textarea back to static text
function cancelEdit() {
    const content = $(this).parents('.user-controls').siblings('.user-content').find('textarea');
    $(this).hide();
    $(this).parents('.user-controls').siblings('.user-content').find('.content-counter').remove();
    $(this).siblings('.edit-save-post').removeClass('edit-mode').text('Edit');
    convertToUneditable(content);
}

// Render individual post display
function renderPost(posts) {
    let postListing = '';
    posts.forEach(post => {
        postListing += 
            `<div class="post">
                <article>
                    <div class="user-info">
                        <span class="user-info__pic"></span>
                        <p style="color:red;" class="post-title">${post.title.rendered}</p>
                    </div>
                    <div class="user-content">
                        ${post.content.rendered}
                    </div>
                    <hr />
                    <div class="user-controls">
                        <span class="delete-post" data-id="${post.id}">Delete</span>
                        <span class="edit-save-post" data-id="${post.id}">Edit</span>
                        <span class="cancel-edit is-inactive" data-id="${post.id}">Cancel</span>
                    </div>
                </article>
            </div>`;
    });

    return postListing;
}

// Converts static text to a textarea
function convertToEditable(content) {
    const editContent =
        `<textarea class="content-area post-content" maxlength="280">${content.html()}</textarea>
        <p class="content-counter"></p>`;
    content.replaceWith(editContent);
}

// Converts textarea back to static text
function convertToUneditable(content) {
    const uneditedContent = `<p>${content.html()}</p>`;
    content.replaceWith(uneditedContent);
}

// Calculates and returns the number of characters remaining based on a limit
function calculateCharsRemaining(input) {
    const maxLength = input.prop('maxLength');
    const charsRemaining = maxLength - input.val().length;

    return charsRemaining;
}

fetchPosts();
